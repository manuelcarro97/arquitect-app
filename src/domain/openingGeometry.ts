import { closestPointOnSegment, distance } from './geometry';
import type { Floor, Opening, Point, WallGeometry } from './types';
import { getWalls } from './walls';

/** Where an opening sits on the plan, plus the door leaf geometry. */
export interface OpeningFrame {
  /** Jamb nearest to the wall start. */
  start: Point;
  /** Jamb nearest to the wall end. */
  end: Point;
  center: Point;
  /** Unit vector along the wall. */
  direction: Point;
  /** Unit vector towards face A of the wall. */
  normal: Point;
  /** Doors: the hinged jamb, the opposite jamb and the leaf tip when opened 90° into its swing side. */
  hinge: Point;
  latch: Point;
  openLeafTip: Point;
}

function along(origin: Point, direction: Point, t: number): Point {
  return { x: origin.x + direction.x * t, y: origin.y + direction.y * t };
}

export function wallDirection(wall: WallGeometry): Point {
  const length = distance(wall.start, wall.end);
  return { x: (wall.end.x - wall.start.x) / length, y: (wall.end.y - wall.start.y) / length };
}

export function openingFrame(wall: WallGeometry, opening: Opening): OpeningFrame {
  const direction = wallDirection(wall);
  const normal = { x: -direction.y, y: direction.x };
  const start = along(wall.start, direction, opening.offset);
  const end = along(wall.start, direction, opening.offset + opening.width);
  const hingeAtEnd = opening.hinge === 'end';
  const hinge = hingeAtEnd ? end : start;
  const side = opening.swingSide === 'B' ? -1 : 1;
  return {
    start,
    end,
    center: along(wall.start, direction, opening.offset + opening.width / 2),
    direction,
    normal,
    hinge,
    latch: hingeAtEnd ? start : end,
    openLeafTip: along(hinge, normal, side * opening.width),
  };
}

/** Wall whose centre line passes closest to `point` (within `maxDistance` cm), and how far along it. */
export function wallAtPoint(
  floor: Floor,
  point: Point,
  maxDistance: number,
): { wall: WallGeometry; along: number } | null {
  let best: { wall: WallGeometry; along: number; distance: number } | null = null;
  for (const wall of getWalls(floor)) {
    if (wall.length <= 0) continue;
    const closest = closestPointOnSegment(point, wall.start, wall.end);
    const d = distance(point, closest);
    if (d <= maxDistance && (!best || d < best.distance)) {
      best = { wall, along: distance(wall.start, closest), distance: d };
    }
  }
  return best && { wall: best.wall, along: best.along };
}

/** Offset that centres an opening of `width` at `alongCm`, kept inside the wall; null if it cannot fit. */
export function centredOffset(wallLength: number, alongCm: number, width: number): number | null {
  if (width > wallLength) return null;
  return Math.min(Math.max(Math.round(alongCm - width / 2), 0), Math.floor(wallLength - width));
}

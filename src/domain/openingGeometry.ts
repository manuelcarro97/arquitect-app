import { closestPointOnSegment, distance, pointInPolygon } from './geometry';
import { perimeterPolygon } from './perimeter';
import type { Floor, Opening, Point, WallGeometry, WallSide } from './types';
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

/** A point in front of the middle of the wall, `distanceCm` away from its centre line on the given face. */
export function pointInFrontOf(wall: WallGeometry, side: WallSide, distanceCm: number): Point {
  const direction = wallDirection(wall);
  const sign = side === 'A' ? 1 : -1;
  const middle = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 };
  return { x: middle.x - direction.y * sign * distanceCm, y: middle.y + direction.x * sign * distanceCm };
}

/** Face of a perimeter wall that looks into the flat (partitions have no inside: "A"). */
export function interiorSide(floor: Floor, wall: WallGeometry): WallSide {
  const polygon = perimeterPolygon(floor.perimeter);
  if (wall.kind !== 'perimeter' || !polygon) return 'A';
  return pointInPolygon(pointInFrontOf(wall, 'A', wall.thickness / 2 + 5), polygon) ? 'A' : 'B';
}

/** Another wall meeting this one, as seen along it. */
export interface WallJunction {
  wallId: string;
  /** Distance from this wall's start to the middle of the joining wall (cm). */
  along: number;
  /** Width the joining wall occupies along this one (its thickness, wider if it arrives at an angle). */
  width: number;
  /** Face(s) of this wall the joining wall stands on. */
  side: WallSide | 'both';
}

/** Below this sine of the angle between walls they are considered parallel. */
const PARALLEL_MAX_SINE = 0.05;

/** Walls (any angle) that end on (T-junction) or cross this wall, ordered along it. Other walls are ignored. */
export function wallJunctions(floor: Floor, wall: WallGeometry): WallJunction[] {
  const direction = wallDirection(wall);
  const normal = { x: -direction.y, y: direction.x };
  const reach = wall.thickness / 2 + 1;
  const alongOf = (p: Point) => (p.x - wall.start.x) * direction.x + (p.y - wall.start.y) * direction.y;
  const acrossOf = (p: Point) => (p.x - wall.start.x) * normal.x + (p.y - wall.start.y) * normal.y;

  const junctions: WallJunction[] = [];
  for (const other of getWalls(floor)) {
    if (other.id === wall.id || other.length <= 0) continue;
    const otherDirection = wallDirection(other);
    const sine = Math.abs(direction.x * otherDirection.y - direction.y * otherDirection.x);
    if (sine < PARALLEL_MAX_SINE) continue; // parallel walls never touch this one across
    // Width it takes along this wall: its thickness, a bit more when it arrives at an angle.
    const width = other.thickness / sine;
    const startAcross = acrossOf(other.start);
    const endAcross = acrossOf(other.end);

    // Crosses the wall line: the ends are on opposite faces.
    if (startAcross * endAcross < 0 && Math.abs(startAcross) > reach && Math.abs(endAcross) > reach) {
      const t = startAcross / (startAcross - endAcross);
      const along = alongOf({ x: other.start.x + (other.end.x - other.start.x) * t, y: other.start.y + (other.end.y - other.start.y) * t });
      if (along > reach && along < wall.length - reach) junctions.push({ wallId: other.id, along, width, side: 'both' });
      continue;
    }
    // Ends on the wall (T-junction or corner): the far end tells which face it stands on.
    for (const [end, far] of [
      [other.start, other.end],
      [other.end, other.start],
    ] as const) {
      const along = alongOf(end);
      if (Math.abs(acrossOf(end)) > reach || along < -reach || along > wall.length + reach) continue;
      // Perimeter corners are the wall's own ends, not divisions.
      if (along <= reach || along >= wall.length - reach) continue;
      junctions.push({ wallId: other.id, along, width, side: acrossOf(far) > 0 ? 'A' : 'B' });
    }
  }
  return junctions.sort((a, b) => a.along - b.along);
}

/** Offset that centres an opening of `width` at `alongCm`, kept inside the wall; null if it cannot fit. */
export function centredOffset(wallLength: number, alongCm: number, width: number): number | null {
  if (width > wallLength) return null;
  return Math.min(Math.max(Math.round(alongCm - width / 2), 0), Math.floor(wallLength - width));
}

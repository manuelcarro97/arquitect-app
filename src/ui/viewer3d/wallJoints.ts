import { closestPointOnSegment, distance, lineIntersection, type Id, type Point, type WallGeometry } from '../../domain';

/**
 * Where each face of a wall starts and ends, in cm along its centreline (0 = wall start, length = wall end).
 * Faces can be longer or shorter than the centreline: that is how corners are cut at an angle (mitred)
 * so two walls meet without overlapping. Overlapping boxes show flickering colours in 3D (z-fighting).
 */
export interface WallEnds {
  startA: number;
  startB: number;
  endA: number;
  endB: number;
}

/** Two wall ends closer than this are treated as the same corner. */
const JOINT_TOLERANCE_CM = 0.5;
/** Very sharp corners would produce endless points: the cut never goes further than this many thicknesses. */
const MITER_LIMIT = 3;

type WallEnd = 'start' | 'end';

interface Frame {
  wall: WallGeometry;
  unit: Point;
  /** Normal on the side of face A: (-unit.y, unit.x). */
  normal: Point;
  half: number;
}

function frameOf(wall: WallGeometry): Frame {
  const unit = { x: (wall.end.x - wall.start.x) / wall.length, y: (wall.end.y - wall.start.y) / wall.length };
  return { wall, unit, normal: { x: -unit.y, y: unit.x }, half: wall.thickness / 2 };
}

const offset = (p: Point, v: Point, k: number): Point => ({ x: p.x + v.x * k, y: p.y + v.y * k });
const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y;
const left = (v: Point): Point => ({ x: -v.y, y: v.x });

function endPoint(frame: Frame, end: WallEnd): Point {
  return end === 'start' ? frame.wall.start : frame.wall.end;
}

/** Direction from that end into the wall. */
function inward(frame: Frame, end: WallEnd): Point {
  return end === 'start' ? frame.unit : { x: -frame.unit.x, y: -frame.unit.y };
}

/** How far into the wall (from its end point) each side ends, for the "left" and "right" side of `inward`. */
interface SideCuts {
  left: number;
  right: number;
}

/**
 * Mitre with another wall that ends at the same corner: each side of this wall is cut where it meets
 * the matching side of the other wall (outer with outer, inner with inner).
 */
function mitreCuts(frame: Frame, end: WallEnd, other: Frame, otherEnd: WallEnd): SideCuts {
  const corner = endPoint(frame, end);
  const d = inward(frame, end);
  const e = inward(other, otherEnd);
  const limit = (frame.half + other.half) * MITER_LIMIT;
  const cut = (side: 1 | -1): number => {
    // The left side of this wall continues into the right side of the other one, and vice versa.
    const own = offset(corner, left(d), side * frame.half);
    const matching = offset(corner, left(e), -side * other.half);
    const hit = lineIntersection(own, d, matching, e);
    if (!hit) return 0;
    const t = dot({ x: hit.x - corner.x, y: hit.y - corner.y }, d);
    return Math.min(Math.max(t, -limit), Math.min(limit, frame.wall.length));
  };
  return { left: cut(1), right: cut(-1) };
}

/** A wall ending against the middle of another one stops at that wall's face instead of going into it. */
function buttCuts(frame: Frame, end: WallEnd, host: Frame): SideCuts | null {
  const corner = endPoint(frame, end);
  const d = inward(frame, end);
  const towards = dot(d, host.normal);
  if (Math.abs(towards) < 1e-6) return null;
  const face = offset(host.wall.start, host.normal, Math.sign(towards) * host.half);
  const cut = (side: 1 | -1): number => {
    const own = offset(corner, left(d), side * frame.half);
    const hit = lineIntersection(own, d, face, host.unit);
    if (!hit) return 0;
    const t = dot({ x: hit.x - corner.x, y: hit.y - corner.y }, d);
    return Math.min(Math.max(t, 0), frame.wall.length / 2);
  };
  return { left: cut(1), right: cut(-1) };
}

function touches(point: Point, other: Frame): boolean {
  return distance(point, closestPointOnSegment(point, other.wall.start, other.wall.end)) <= JOINT_TOLERANCE_CM;
}

function endAt(point: Point, other: Frame): WallEnd | null {
  if (distance(point, other.wall.start) <= JOINT_TOLERANCE_CM) return 'start';
  if (distance(point, other.wall.end) <= JOINT_TOLERANCE_CM) return 'end';
  return null;
}

/**
 * Partition ends: mitre when exactly one other partition ends there (an L), stop at the face of the wall
 * it rests against (a T, or a partition meeting the perimeter). Anything else keeps a square end.
 */
function partitionCuts(frame: Frame, end: WallEnd, frames: Frame[]): SideCuts | null {
  const point = endPoint(frame, end);
  const others = frames.filter((other) => other !== frame);

  const perimeterHosts = others.filter((other) => other.wall.kind === 'perimeter' && touches(point, other));
  if (perimeterHosts.length === 1) return buttCuts(frame, end, perimeterHosts[0]);
  if (perimeterHosts.length > 1) return null;

  const partitions = others.filter((other) => other.wall.kind === 'partition' && touches(point, other));
  const sharingEnd = partitions.filter((other) => endAt(point, other) !== null);
  if (sharingEnd.length === 1 && partitions.length === 1) {
    return mitreCuts(frame, end, sharingEnd[0], endAt(point, sharingEnd[0])!);
  }
  if (sharingEnd.length === 0 && partitions.length === 1) return buttCuts(frame, end, partitions[0]);
  return null;
}

/** The perimeter wall before (at the start) or after (at the end) this one, following the drawing order. */
function perimeterNeighbour(perimeter: Frame[], index: number, end: WallEnd, closed: boolean): Frame | null {
  const neighbour = end === 'start' ? index - 1 : index + 1;
  if (neighbour >= 0 && neighbour < perimeter.length) return perimeter[neighbour];
  return closed ? perimeter[(neighbour + perimeter.length) % perimeter.length] : null;
}

/**
 * Face extents of every wall so that corners close cleanly: perimeter corners are mitred,
 * partitions stop at the faces of the walls they touch. Walls not in the map keep square ends.
 */
export function wallEnds(walls: WallGeometry[], perimeterClosed: boolean): Map<Id, WallEnds> {
  const frames = walls.filter((wall) => wall.length > 0).map(frameOf);
  const perimeter = frames.filter((frame) => frame.wall.kind === 'perimeter');
  const result = new Map<Id, WallEnds>();

  for (const frame of frames) {
    const cutsAt = (end: WallEnd): SideCuts | null => {
      if (frame.wall.kind === 'partition') return partitionCuts(frame, end, frames);
      const neighbour = perimeterNeighbour(perimeter, perimeter.indexOf(frame), end, perimeterClosed);
      if (!neighbour || perimeter.length < 2) return null;
      return mitreCuts(frame, end, neighbour, end === 'start' ? 'end' : 'start');
    };
    const start = cutsAt('start') ?? { left: 0, right: 0 };
    const end = cutsAt('end') ?? { left: 0, right: 0 };
    const { length } = frame.wall;
    // At the start, "left" of the inward direction is face A; at the end it is face B.
    result.set(frame.wall.id, {
      startA: start.left,
      startB: start.right,
      endA: length - end.right,
      endB: length - end.left,
    });
  }
  return result;
}

export function squareEnds(wall: WallGeometry): WallEnds {
  return { startA: 0, startB: 0, endA: wall.length, endB: wall.length };
}

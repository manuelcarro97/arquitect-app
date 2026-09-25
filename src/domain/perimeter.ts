import {
  EPSILON,
  angleBetween,
  direction,
  distance,
  lineIntersection,
  normalizeAngle,
  pointFromPolar,
} from './geometry';
import { createId } from './ids';
import { err, ok, type Result } from './result';
import type { Id, Perimeter, PerimeterSegment, Point } from './types';

export const CLOSURE_TOLERANCE_CM = 0.5;
export const DEFAULT_PERIMETER_WALL = { thickness: 30, height: 250 };

export interface SegmentInput {
  length: number;
  angle: number;
}

export function createPerimeter(start: Point = { x: 0, y: 0 }): Perimeter {
  return { start, segments: [] };
}

/** Start point followed by the end point of every segment (segments.length + 1 points). */
export function perimeterCorners(perimeter: Perimeter): Point[] {
  const corners = [perimeter.start];
  let current = perimeter.start;
  for (const segment of perimeter.segments) {
    current = pointFromPolar(current, segment.length, segment.angle);
    corners.push(current);
  }
  return corners;
}

/** Distance between the last corner and the start. This is the "descuadre". */
export function closureGap(perimeter: Perimeter): number {
  if (perimeter.segments.length === 0) return 0;
  const corners = perimeterCorners(perimeter);
  return distance(corners[corners.length - 1], perimeter.start);
}

export function isPerimeterClosed(perimeter: Perimeter): boolean {
  return perimeter.segments.length >= 3 && closureGap(perimeter) <= CLOSURE_TOLERANCE_CM;
}

/** Polygon of the closed perimeter (one point per corner), or null if it is not closed. */
export function perimeterPolygon(perimeter: Perimeter): Point[] | null {
  if (!isPerimeterClosed(perimeter)) return null;
  return perimeterCorners(perimeter).slice(0, -1);
}

export function appendSegment(perimeter: Perimeter, input: SegmentInput): Result<Perimeter> {
  if (!(input.length > 0)) return err('INVALID_LENGTH');
  if (isPerimeterClosed(perimeter)) return err('PERIMETER_ALREADY_CLOSED');
  const segment: PerimeterSegment = {
    id: createId(),
    length: input.length,
    angle: normalizeAngle(input.angle),
    ...DEFAULT_PERIMETER_WALL,
  };
  return ok({ ...perimeter, segments: [...perimeter.segments, segment] });
}

/** Adds the segment that joins the last corner with the start. */
export function appendClosingSegment(perimeter: Perimeter): Result<Perimeter> {
  if (perimeter.segments.length < 2) return err('NOT_ENOUGH_SEGMENTS');
  if (isPerimeterClosed(perimeter)) return err('PERIMETER_ALREADY_CLOSED');
  const corners = perimeterCorners(perimeter);
  const last = corners[corners.length - 1];
  return appendSegment(perimeter, {
    length: distance(last, perimeter.start),
    angle: angleBetween(last, perimeter.start),
  });
}

export function updateSegment(
  perimeter: Perimeter,
  segmentId: Id,
  changes: Partial<SegmentInput>,
): Result<Perimeter> {
  const index = perimeter.segments.findIndex((segment) => segment.id === segmentId);
  if (index === -1) return err('SEGMENT_NOT_FOUND');
  if (changes.length !== undefined && !(changes.length > 0)) return err('INVALID_LENGTH');
  const segments = perimeter.segments.map((segment, i) =>
    i === index
      ? {
          ...segment,
          ...changes,
          angle: normalizeAngle(changes.angle ?? segment.angle),
        }
      : segment,
  );
  return ok({ ...perimeter, segments });
}

export function removeSegment(perimeter: Perimeter, segmentId: Id): Result<Perimeter> {
  if (!perimeter.segments.some((segment) => segment.id === segmentId)) return err('SEGMENT_NOT_FOUND');
  return ok({
    ...perimeter,
    segments: perimeter.segments.filter((segment) => segment.id !== segmentId),
  });
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

function vector(from: Point, to: Point): Point {
  return { x: to.x - from.x, y: to.y - from.y };
}

/**
 * Moves a segment perpendicular to itself by `offset` cm along its normal (-dir.y, dir.x).
 * Neighbouring segments keep their direction and stretch/shrink to stay connected.
 */
export function moveSegment(perimeter: Perimeter, segmentId: Id, offset: number): Result<Perimeter> {
  const index = perimeter.segments.findIndex((segment) => segment.id === segmentId);
  if (index === -1) return err('SEGMENT_NOT_FOUND');

  const count = perimeter.segments.length;
  const closed = isPerimeterClosed(perimeter);
  const corners = perimeterCorners(perimeter);
  const directionOf = (i: number) => direction(perimeter.segments[i].angle);

  const movedDirection = directionOf(index);
  const normal = { x: -movedDirection.y, y: movedDirection.x };
  const shift = (p: Point): Point => ({ x: p.x + normal.x * offset, y: p.y + normal.y * offset });

  const previousIndex = index > 0 ? index - 1 : closed ? count - 1 : null;
  const nextIndex = index < count - 1 ? index + 1 : closed ? 0 : null;

  let newStart = shift(corners[index]);
  let newEnd = shift(corners[index + 1]);

  if (previousIndex !== null) {
    const hit = lineIntersection(corners[previousIndex], directionOf(previousIndex), newStart, movedDirection);
    if (!hit) return err('SEGMENT_NOT_MOVABLE');
    newStart = hit;
  }
  if (nextIndex !== null) {
    const hit = lineIntersection(corners[nextIndex + 1], directionOf(nextIndex), newEnd, movedDirection);
    if (!hit) return err('SEGMENT_NOT_MOVABLE');
    newEnd = hit;
  }

  const newCorners = [...corners];
  newCorners[index] = newStart;
  newCorners[index + 1] = newEnd;
  if (closed && index === 0) newCorners[count] = newStart;
  if (closed && index === count - 1) newCorners[0] = newEnd;

  const changed = new Set([index, previousIndex, nextIndex].filter((i): i is number => i !== null));
  for (const i of changed) {
    // A segment must keep pointing the same way; otherwise it collapsed or flipped.
    if (dot(vector(newCorners[i], newCorners[i + 1]), directionOf(i)) <= EPSILON) {
      return err('SEGMENT_NOT_MOVABLE');
    }
  }

  const segments = perimeter.segments.map((segment, i) =>
    changed.has(i)
      ? {
          ...segment,
          length: distance(newCorners[i], newCorners[i + 1]),
          angle: angleBetween(newCorners[i], newCorners[i + 1]),
        }
      : segment,
  );
  return ok({ start: newCorners[0], segments });
}

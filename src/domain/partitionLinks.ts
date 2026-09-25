import {
  EPSILON,
  distance,
  lineIntersection,
  pointOnSegment,
  segmentInsidePolygon,
} from './geometry';
import { perimeterPolygon } from './perimeter';
import { err, ok, type Result } from './result';
import type { Floor, Id, Opening, Partition, Point } from './types';
import { getWalls } from './walls';

/** Two points closer than this (cm) are the same joint. */
const LINK_TOLERANCE_CM = 0.5;

type End = 'a' | 'b';

function unitVector(from: Point, to: Point): Point {
  const length = distance(from, to);
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

function samePoint(p: Point, q: Point): boolean {
  return distance(p, q) <= LINK_TOLERANCE_CM;
}

function parallel(u: Point, v: Point): boolean {
  return Math.abs(u.x * v.y - u.y * v.x) < 1e-6;
}

/** Point strictly inside the partition (not one of its ends), i.e. a T-junction. */
function isInteriorPoint(point: Point, partition: Partition): boolean {
  return (
    pointOnSegment(point, partition.a, partition.b) &&
    !samePoint(point, partition.a) &&
    !samePoint(point, partition.b)
  );
}

/** Keeps the openings of a partition in place when its start point `a` slides along its own line. */
function shiftOpenings(openings: Opening[], partition: Partition, newA: Point): Opening[] {
  const direction = unitVector(partition.a, partition.b);
  const shift = (newA.x - partition.a.x) * direction.x + (newA.y - partition.a.y) * direction.y;
  if (Math.abs(shift) < EPSILON) return openings;
  return openings.map((opening) =>
    opening.wallId === partition.id ? { ...opening, offset: opening.offset - shift } : opening,
  );
}

/**
 * After `original` became `updated`, reconnects the partitions linked to it:
 * ends shared with its ends follow them, and ends resting on it (T-junctions) stretch to its new line.
 */
function relinkNeighbours(floor: Floor, original: Partition, updated: Partition): Floor {
  const updatedDirection = unitVector(updated.a, updated.b);
  let openings = floor.openings;

  const partitions = floor.partitions.map((partition) => {
    if (partition.id === original.id) return updated;
    const direction = unitVector(partition.a, partition.b);
    const follow = (end: Point): Point => {
      if (samePoint(end, original.a)) return updated.a;
      if (samePoint(end, original.b)) return updated.b;
      if (isInteriorPoint(end, original) && !parallel(direction, updatedDirection)) {
        return lineIntersection(end, direction, updated.a, updatedDirection) ?? end;
      }
      return end;
    };
    const a = follow(partition.a);
    const b = follow(partition.b);
    if (a === partition.a && b === partition.b) return partition;
    openings = shiftOpenings(openings, partition, a);
    return { ...partition, a, b };
  });

  return { ...floor, partitions, openings };
}

/** Rejects the edit if any changed partition collapsed, flipped or left the perimeter. */
function validateChanged(before: Floor, after: Floor): Result<Floor> {
  const polygon = perimeterPolygon(after.perimeter);
  if (!polygon) return err('PERIMETER_NOT_CLOSED');
  for (const partition of after.partitions) {
    const previous = before.partitions.find((p) => p.id === partition.id);
    if (!previous || (previous.a === partition.a && previous.b === partition.b)) continue;
    if (distance(partition.a, partition.b) < 1) return err('INVALID_LENGTH');
    const oldDirection = unitVector(previous.a, previous.b);
    const newDirection = unitVector(partition.a, partition.b);
    if (oldDirection.x * newDirection.x + oldDirection.y * newDirection.y <= 0) return err('INVALID_LENGTH');
    if (!segmentInsidePolygon(partition.a, partition.b, polygon)) return err('PARTITION_OUTSIDE_PERIMETER');
  }
  return ok(after);
}

/**
 * Moves a partition perpendicular to itself by `offset` cm along its normal (-dir.y, dir.x).
 * Ends resting on a wall slide along that wall; linked partitions stretch to stay connected.
 */
export function movePartitionPerpendicular(floor: Floor, partitionId: Id, offset: number): Result<Floor> {
  const partition = floor.partitions.find((p) => p.id === partitionId);
  if (!partition) return err('PARTITION_NOT_FOUND');
  if (offset === 0) return ok(floor);

  const direction = unitVector(partition.a, partition.b);
  const normal = { x: -direction.y, y: direction.x };
  const shifted = (p: Point): Point => ({ x: p.x + normal.x * offset, y: p.y + normal.y * offset });
  const otherWalls = getWalls(floor).filter((wall) => wall.id !== partitionId);

  const newEnd = (end: End): Point => {
    const point = partition[end];
    for (const wall of otherWalls) {
      if (!pointOnSegment(point, wall.start, wall.end) || wall.length < EPSILON) continue;
      const wallDirection = unitVector(wall.start, wall.end);
      if (parallel(wallDirection, direction)) continue;
      const hit = lineIntersection(shifted(partition.a), direction, wall.start, wallDirection);
      if (hit) return hit;
    }
    return shifted(point);
  };

  const updated: Partition = { ...partition, a: newEnd('a'), b: newEnd('b') };
  const withMoved = { ...floor, openings: shiftOpenings(floor.openings, { ...partition, a: shifted(partition.a) }, updated.a) };
  return validateChanged(floor, relinkNeighbours(withMoved, partition, updated));
}

/** Moves one end of a partition; partitions joined at that end follow it. */
export function movePartitionEndpoint(floor: Floor, partitionId: Id, end: End, point: Point): Result<Floor> {
  const partition = floor.partitions.find((p) => p.id === partitionId);
  if (!partition) return err('PARTITION_NOT_FOUND');
  const updated: Partition = { ...partition, [end]: point };
  if (distance(updated.a, updated.b) < 1) return err('INVALID_LENGTH');
  const openings = end === 'a' ? shiftOpenings(floor.openings, partition, point) : floor.openings;
  const relinked = relinkNeighbours({ ...floor, openings }, partition, updated);

  // The dragged partition may rotate, so only its length/inside checks apply to it.
  const polygon = perimeterPolygon(relinked.perimeter);
  if (!polygon) return err('PERIMETER_NOT_CLOSED');
  if (!segmentInsidePolygon(updated.a, updated.b, polygon)) return err('PARTITION_OUTSIDE_PERIMETER');
  const others = { ...relinked, partitions: relinked.partitions.map((p) => (p.id === partitionId ? partition : p)) };
  const checked = validateChanged({ ...floor, partitions: floor.partitions }, others);
  return checked.ok ? ok(relinked) : checked;
}

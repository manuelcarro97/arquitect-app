import { angleBetween, distance, pointFromPolar, segmentInsidePolygon } from './geometry';
import { createId } from './ids';
import { removeOpeningsOnWall } from './openings';
import { perimeterPolygon } from './perimeter';
import { err, ok, type DomainError, type Result } from './result';
import type { Floor, Id, Partition, Point } from './types';

export const DEFAULT_PARTITION_WALL = { thickness: 10, height: 250 };
export const MIN_WALL_LENGTH_CM = 1;

function placementError(floor: Floor, a: Point, b: Point): DomainError | null {
  const polygon = perimeterPolygon(floor.perimeter);
  if (!polygon) return 'PERIMETER_NOT_CLOSED';
  if (distance(a, b) < MIN_WALL_LENGTH_CM) return 'INVALID_LENGTH';
  if (!segmentInsidePolygon(a, b, polygon)) return 'PARTITION_OUTSIDE_PERIMETER';
  return null;
}

function replacePartition(floor: Floor, updated: Partition): Floor {
  return {
    ...floor,
    partitions: floor.partitions.map((partition) => (partition.id === updated.id ? updated : partition)),
  };
}

export function addPartition(floor: Floor, a: Point, b: Point): Result<Floor> {
  const error = placementError(floor, a, b);
  if (error) return err(error);
  const partition: Partition = { id: createId(), a, b, ...DEFAULT_PARTITION_WALL };
  return ok({ ...floor, partitions: [...floor.partitions, partition] });
}

export function setPartitionEndpoints(floor: Floor, partitionId: Id, a: Point, b: Point): Result<Floor> {
  const current = floor.partitions.find((partition) => partition.id === partitionId);
  if (!current) return err('PARTITION_NOT_FOUND');
  const error = placementError(floor, a, b);
  if (error) return err(error);
  return ok(replacePartition(floor, { ...current, a, b }));
}

export function movePartition(floor: Floor, partitionId: Id, delta: Point): Result<Floor> {
  const current = floor.partitions.find((partition) => partition.id === partitionId);
  if (!current) return err('PARTITION_NOT_FOUND');
  const shift = (p: Point): Point => ({ x: p.x + delta.x, y: p.y + delta.y });
  return setPartitionEndpoints(floor, partitionId, shift(current.a), shift(current.b));
}

/** Keeps endpoint `a` and the direction; moves `b`. */
export function setPartitionLength(floor: Floor, partitionId: Id, length: number): Result<Floor> {
  const current = floor.partitions.find((partition) => partition.id === partitionId);
  if (!current) return err('PARTITION_NOT_FOUND');
  const b = pointFromPolar(current.a, length, angleBetween(current.a, current.b));
  return setPartitionEndpoints(floor, partitionId, current.a, b);
}

export function removePartition(floor: Floor, partitionId: Id): Result<Floor> {
  if (!floor.partitions.some((partition) => partition.id === partitionId)) return err('PARTITION_NOT_FOUND');
  const withoutPartition = {
    ...floor,
    partitions: floor.partitions.filter((partition) => partition.id !== partitionId),
  };
  return ok(removeOpeningsOnWall(withoutPartition, partitionId));
}

/** Partitions that are no longer valid after a perimeter edit (shown as warnings in the UI). */
export function invalidPartitionIds(floor: Floor): Id[] {
  return floor.partitions
    .filter((partition) => placementError(floor, partition.a, partition.b) !== null)
    .map((partition) => partition.id);
}

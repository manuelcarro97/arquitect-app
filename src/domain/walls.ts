import { distance } from './geometry';
import { perimeterCorners } from './perimeter';
import type { Floor, Id, WallGeometry } from './types';

/** Perimeter walls (in order) followed by partitions, all with the same shape. */
export function getWalls(floor: Floor): WallGeometry[] {
  const corners = perimeterCorners(floor.perimeter);
  const perimeterWalls: WallGeometry[] = floor.perimeter.segments.map((segment, i) => ({
    id: segment.id,
    kind: 'perimeter',
    start: corners[i],
    end: corners[i + 1],
    length: segment.length,
    thickness: segment.thickness,
    height: segment.height,
    finishA: segment.finishA,
    finishB: segment.finishB,
  }));
  const partitionWalls: WallGeometry[] = floor.partitions.map((partition) => ({
    id: partition.id,
    kind: 'partition',
    start: partition.a,
    end: partition.b,
    length: distance(partition.a, partition.b),
    thickness: partition.thickness,
    height: partition.height,
    finishA: partition.finishA,
    finishB: partition.finishB,
  }));
  return [...perimeterWalls, ...partitionWalls];
}

export function findWall(floor: Floor, wallId: Id): WallGeometry | undefined {
  return getWalls(floor).find((wall) => wall.id === wallId);
}

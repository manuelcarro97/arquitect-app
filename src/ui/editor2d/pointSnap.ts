import {
  closestPointOnSegment,
  direction,
  distance,
  getWalls,
  perimeterCorners,
  pointFromPolar,
  rayHitsSegment,
  type Floor,
  type Point,
} from '../../domain';
import { snapPointToGrid } from './snap';

export interface SnapSegment {
  a: Point;
  b: Point;
}

/** Things a new point can stick to: wall corners/ends and wall centre lines. */
export interface SnapTargets {
  points: Point[];
  segments: SnapSegment[];
}

export type SnapKind = 'point' | 'segment' | 'grid';

export interface SnappedPoint {
  point: Point;
  kind: SnapKind;
}

export function snapTargetsFor(floor: Floor, options: { excludePartitionId?: string } = {}): SnapTargets {
  const walls = getWalls(floor).filter((wall) => wall.id !== options.excludePartitionId);
  const corners = perimeterCorners(floor.perimeter).slice(0, -1);
  const partitionEnds = floor.partitions
    .filter((partition) => partition.id !== options.excludePartitionId)
    .flatMap((partition) => [partition.a, partition.b]);
  return {
    points: [...corners, ...partitionEnds],
    segments: walls.map((wall) => ({ a: wall.start, b: wall.end })),
  };
}

/** Sticks `p` to the nearest corner, else the nearest wall line (within `tolerance` cm), else the grid. */
export function snapPoint(p: Point, targets: SnapTargets, tolerance: number, gridStep: number): SnappedPoint {
  let best: SnappedPoint | null = null;
  let bestDistance = tolerance;
  for (const target of targets.points) {
    const d = distance(p, target);
    if (d <= bestDistance) {
      best = { point: target, kind: 'point' };
      bestDistance = d;
    }
  }
  if (best) return best;

  for (const segment of targets.segments) {
    const onSegment = closestPointOnSegment(p, segment.a, segment.b);
    const d = distance(p, onSegment);
    if (d <= bestDistance) {
      best = { point: onSegment, kind: 'segment' };
      bestDistance = d;
    }
  }
  return best ?? { point: snapPointToGrid(p, gridStep), kind: 'grid' };
}

/**
 * For a segment drawn from `start` at a fixed angle, stretches its length to the nearest wall
 * the ray crosses if that crossing is within `tolerance` cm of `length`.
 */
export function snapLengthToWalls(
  start: Point,
  angle: number,
  length: number,
  segments: SnapSegment[],
  tolerance: number,
): { length: number; end: Point; snapped: boolean } {
  const unit = direction(angle);
  let best: number | null = null;
  for (const segment of segments) {
    const hit = rayHitsSegment(start, unit, segment.a, segment.b);
    if (hit !== null && Math.abs(hit - length) <= tolerance && (best === null || Math.abs(hit - length) < Math.abs(best - length))) {
      best = hit;
    }
  }
  const finalLength = best ?? length;
  return { length: finalLength, end: pointFromPolar(start, finalLength, angle), snapped: best !== null };
}

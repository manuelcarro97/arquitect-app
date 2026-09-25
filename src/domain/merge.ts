import { EPSILON, distance, normalizeAngle } from './geometry';
import { isPerimeterClosed, perimeterCorners } from './perimeter';
import type { Floor, Opening, Partition, PerimeterSegment, Point } from './types';

const ANGLE_TOLERANCE_DEG = 0.01;

function sameDirection(a: PerimeterSegment, b: PerimeterSegment): boolean {
  const difference = normalizeAngle(a.angle - b.angle);
  return difference < ANGLE_TOLERANCE_DEG || difference > 360 - ANGLE_TOLERANCE_DEG;
}

function canMerge(a: PerimeterSegment, b: PerimeterSegment): boolean {
  return sameDirection(a, b) && a.thickness === b.thickness && a.height === b.height && !a.arc && !b.arc;
}

/** Moves the openings of `absorbed` onto `target`, shifting them by `offsetShift` cm. */
function reassignOpenings(openings: Opening[], absorbedId: string, targetId: string, offsetShift: number): Opening[] {
  return openings.map((opening) =>
    opening.wallId === absorbedId ? { ...opening, wallId: targetId, offset: opening.offset + offsetShift } : opening,
  );
}

/**
 * Joins consecutive perimeter segments that continue in the same direction into a single wall
 * (also the last with the first when the perimeter is closed). Openings follow their wall.
 * Returns the same floor object when nothing changes.
 */
export function mergeCollinearSegments(floor: Floor): Floor {
  let start = floor.perimeter.start;
  let segments = [...floor.perimeter.segments];
  let openings = floor.openings;
  let changed = false;

  let i = 0;
  while (i < segments.length - 1) {
    const current = segments[i];
    const next = segments[i + 1];
    if (canMerge(current, next)) {
      openings = reassignOpenings(openings, next.id, current.id, current.length);
      segments.splice(i, 2, { ...current, length: current.length + next.length });
      changed = true;
    } else {
      i++;
    }
  }

  if (segments.length > 3 && isPerimeterClosed({ start, segments })) {
    const first = segments[0];
    const last = segments[segments.length - 1];
    if (canMerge(last, first)) {
      const corners = perimeterCorners({ start, segments });
      start = corners[corners.length - 2];
      // Openings on the first wall now start after the absorbed last wall.
      openings = openings.map((opening) =>
        opening.wallId === first.id ? { ...opening, offset: opening.offset + last.length } : opening,
      );
      openings = reassignOpenings(openings, last.id, first.id, 0);
      segments = [{ ...first, length: first.length + last.length }, ...segments.slice(1, -1)];
      changed = true;
    }
  }

  if (!changed) return floor;
  return { ...floor, perimeter: { start, segments }, openings };
}

const COLLINEAR_TOLERANCE_CM = 0.5;

/** Joins partition `b` into `a` if they lie on the same line and touch or overlap; otherwise null. */
function mergePartitionPair(a: Partition, b: Partition, openings: Opening[]): { partition: Partition; openings: Opening[] } | null {
  if (a.thickness !== b.thickness || a.height !== b.height) return null;
  const lengthA = distance(a.a, a.b);
  if (lengthA < EPSILON) return null;
  const unit = { x: (a.b.x - a.a.x) / lengthA, y: (a.b.y - a.a.y) / lengthA };
  const along = (p: Point) => (p.x - a.a.x) * unit.x + (p.y - a.a.y) * unit.y;
  const across = (p: Point) => Math.abs((p.x - a.a.x) * unit.y - (p.y - a.a.y) * unit.x);
  if (across(b.a) > COLLINEAR_TOLERANCE_CM || across(b.b) > COLLINEAR_TOLERANCE_CM) return null;

  const bStart = along(b.a);
  const bEnd = along(b.b);
  const bMin = Math.min(bStart, bEnd);
  const bMax = Math.max(bStart, bEnd);
  if (bMin > lengthA + COLLINEAR_TOLERANCE_CM || bMax < -COLLINEAR_TOLERANCE_CM) return null;

  const min = Math.min(0, bMin);
  const max = Math.max(lengthA, bMax);
  const at = (t: number): Point => ({ x: a.a.x + unit.x * t, y: a.a.y + unit.y * t });
  const bSameDirection = bEnd >= bStart;

  const remapped = openings.map((opening) => {
    if (opening.wallId === a.id) return { ...opening, offset: opening.offset - min };
    if (opening.wallId !== b.id) return opening;
    const start = bSameDirection ? bStart + opening.offset : bStart - opening.offset - opening.width;
    return { ...opening, wallId: a.id, offset: start - min };
  });
  return { partition: { ...a, a: at(min), b: at(max) }, openings: remapped };
}

/**
 * Joins partitions that lie on the same line and touch or overlap into a single partition,
 * like perimeter walls. Openings follow their wall. Returns the same floor object when nothing changes.
 */
export function mergeCollinearPartitions(floor: Floor): Floor {
  let partitions = floor.partitions;
  let openings = floor.openings;
  let changed = false;

  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < partitions.length && !merged; i++) {
      for (let j = i + 1; j < partitions.length && !merged; j++) {
        const result = mergePartitionPair(partitions[i], partitions[j], openings);
        if (result) {
          partitions = partitions.filter((_, k) => k !== j).map((p, k) => (k === i ? result.partition : p));
          openings = result.openings;
          merged = true;
          changed = true;
        }
      }
    }
  }
  return changed ? { ...floor, partitions, openings } : floor;
}

import { normalizeAngle } from './geometry';
import { isPerimeterClosed, perimeterCorners } from './perimeter';
import type { Floor, Opening, PerimeterSegment } from './types';

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

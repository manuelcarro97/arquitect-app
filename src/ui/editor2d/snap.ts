import { angleBetween, direction, distance, normalizeAngle, pointFromPolar, type Point } from '../../domain';

export const LENGTH_STEP_CM = 5;

export function snapToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function snapPointToGrid(point: Point, step: number): Point {
  return { x: snapToStep(point.x, step), y: snapToStep(point.y, step) };
}

export interface DrawPreview {
  from: Point;
  to: Point;
  length: number;
  angle: number;
}

/** Angle snapping options for drawing. 0 = free (rounded to 0.1°). */
export const ANGLE_STEPS = [90, 45, 15, 0] as const;
export type AngleStep = (typeof ANGLE_STEPS)[number];

/**
 * Segment that would be drawn from `from` towards the pointer.
 * The angle snaps to multiples of `angleStep` (0 = free) and the length to 5 cm.
 * `typedLength` (entered with the keyboard) overrides the pointer distance.
 */
export function computeDrawPreview(
  from: Point,
  pointer: Point,
  options: { angleStep: AngleStep; typedLength: number | null },
): DrawPreview | null {
  const rawAngle = angleBetween(from, pointer);
  const free = options.angleStep === 0;
  const angle = free ? Math.round(rawAngle * 10) / 10 : normalizeAngle(snapToStep(rawAngle, options.angleStep));
  const unit = direction(angle);
  const projected = free ? distance(from, pointer) : (pointer.x - from.x) * unit.x + (pointer.y - from.y) * unit.y;
  const length = options.typedLength ?? snapToStep(projected, LENGTH_STEP_CM);
  if (!(length > 0)) return null;
  return { from, to: pointFromPolar(from, length, angle), length, angle };
}

export interface AlignmentGuide {
  from: Point;
  to: Point;
}

/** Guides closer than this (in cm) are considered exact alignments and drawn. */
const ALIGNED_CM = 0.5;
/** Directions almost perpendicular to an axis cannot reach that axis' alignment. */
const MIN_AXIS_COMPONENT = 0.05;

/**
 * Shows dashed guides when the preview end lines up horizontally or vertically with an existing corner.
 * With `snap`, stretches the segment (keeping its angle) to the nearest alignment within `tolerance` cm.
 */
export function alignWithCorners(
  preview: DrawPreview,
  corners: Point[],
  options: { tolerance: number; snap: boolean },
): { preview: DrawPreview; guides: AlignmentGuide[] } {
  const others = corners.filter((corner) => distance(corner, preview.from) > ALIGNED_CM);
  let aligned = preview;

  if (options.snap) {
    const unit = direction(preview.angle);
    let best: { length: number; delta: number } | null = null;
    for (const corner of others) {
      const candidates = [
        { component: unit.x, target: corner.x - preview.from.x, delta: Math.abs(preview.to.x - corner.x) },
        { component: unit.y, target: corner.y - preview.from.y, delta: Math.abs(preview.to.y - corner.y) },
      ];
      for (const { component, target, delta } of candidates) {
        if (Math.abs(component) < MIN_AXIS_COMPONENT || delta > options.tolerance) continue;
        const length = target / component;
        if (length > 0 && (!best || delta < best.delta)) best = { length, delta };
      }
    }
    if (best) {
      aligned = { ...preview, length: best.length, to: pointFromPolar(preview.from, best.length, preview.angle) };
    }
  }

  const guides: AlignmentGuide[] = [];
  for (const corner of others) {
    if (Math.abs(aligned.to.x - corner.x) < ALIGNED_CM || Math.abs(aligned.to.y - corner.y) < ALIGNED_CM) {
      guides.push({ from: corner, to: aligned.to });
    }
  }
  return { preview: aligned, guides };
}

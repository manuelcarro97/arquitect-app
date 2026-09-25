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

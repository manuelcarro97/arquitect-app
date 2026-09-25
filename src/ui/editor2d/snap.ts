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

/**
 * Segment that would be drawn from `from` towards the pointer.
 * By default the angle snaps to 0/90/180/270 and the length to 5 cm; `freeAngle` disables the angle snap.
 * `typedLength` (entered with the keyboard) overrides the pointer distance.
 */
export function computeDrawPreview(
  from: Point,
  pointer: Point,
  options: { freeAngle: boolean; typedLength: number | null },
): DrawPreview | null {
  const rawAngle = angleBetween(from, pointer);
  const angle = options.freeAngle ? Math.round(rawAngle * 10) / 10 : normalizeAngle(snapToStep(rawAngle, 90));
  const unit = direction(angle);
  const projected = options.freeAngle
    ? distance(from, pointer)
    : (pointer.x - from.x) * unit.x + (pointer.y - from.y) * unit.y;
  const length = options.typedLength ?? snapToStep(projected, LENGTH_STEP_CM);
  if (!(length > 0)) return null;
  return { from, to: pointFromPolar(from, length, angle), length, angle };
}

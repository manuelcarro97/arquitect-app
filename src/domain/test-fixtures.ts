import { appendSegment, createPerimeter } from './perimeter';
import { unwrap } from './result';
import type { Perimeter } from './types';

/** Clockwise (on screen) rectangle starting at the origin. */
export function rectanglePerimeter(width: number, height: number): Perimeter {
  let perimeter = createPerimeter();
  perimeter = unwrap(appendSegment(perimeter, { length: width, angle: 0 }));
  perimeter = unwrap(appendSegment(perimeter, { length: height, angle: 90 }));
  perimeter = unwrap(appendSegment(perimeter, { length: width, angle: 180 }));
  perimeter = unwrap(appendSegment(perimeter, { length: height, angle: 270 }));
  return perimeter;
}

/** 400×400 square without its bottom-right 200×200 quadrant. */
export function lShapePerimeter(): Perimeter {
  let perimeter = createPerimeter();
  const steps = [
    { length: 400, angle: 0 },
    { length: 200, angle: 90 },
    { length: 200, angle: 180 },
    { length: 200, angle: 90 },
    { length: 200, angle: 180 },
    { length: 400, angle: 270 },
  ];
  for (const step of steps) perimeter = unwrap(appendSegment(perimeter, step));
  return perimeter;
}

import { describe, expect, it } from 'vitest';
import {
  appendClosingSegment,
  appendSegment,
  closureGap,
  createPerimeter,
  isPerimeterClosed,
  moveSegment,
  perimeterCorners,
  perimeterPolygon,
  removeSegment,
  updateSegment,
} from './perimeter';
import { unwrap } from './result';
import { lShapePerimeter, rectanglePerimeter } from './test-fixtures';

describe('perimeter derived data', () => {
  it('derives corners from start and turtle segments', () => {
    const corners = perimeterCorners(rectanglePerimeter(400, 300));
    expect(corners).toHaveLength(5);
    expect(corners[2].x).toBeCloseTo(400);
    expect(corners[2].y).toBeCloseTo(300);
  });

  it('is closed when the last corner meets the start', () => {
    const perimeter = rectanglePerimeter(400, 300);
    expect(closureGap(perimeter)).toBeCloseTo(0);
    expect(isPerimeterClosed(perimeter)).toBe(true);
    expect(perimeterPolygon(perimeter)).toHaveLength(4);
  });

  it('reports the closure gap (descuadre) when it does not close', () => {
    let perimeter = createPerimeter();
    perimeter = unwrap(appendSegment(perimeter, { length: 400, angle: 0 }));
    perimeter = unwrap(appendSegment(perimeter, { length: 300, angle: 90 }));
    perimeter = unwrap(appendSegment(perimeter, { length: 396, angle: 180 }));
    perimeter = unwrap(appendSegment(perimeter, { length: 300, angle: 270 }));
    expect(closureGap(perimeter)).toBeCloseTo(4);
    expect(isPerimeterClosed(perimeter)).toBe(false);
    expect(perimeterPolygon(perimeter)).toBeNull();
  });
});

describe('perimeter edits', () => {
  it('rejects non-positive lengths and appending to a closed perimeter', () => {
    expect(appendSegment(createPerimeter(), { length: 0, angle: 0 })).toEqual({ ok: false, error: 'INVALID_LENGTH' });
    expect(appendSegment(rectanglePerimeter(400, 300), { length: 10, angle: 0 })).toEqual({
      ok: false,
      error: 'PERIMETER_ALREADY_CLOSED',
    });
  });

  it('closes an open perimeter with a computed segment', () => {
    let perimeter = createPerimeter();
    perimeter = unwrap(appendSegment(perimeter, { length: 400, angle: 0 }));
    perimeter = unwrap(appendSegment(perimeter, { length: 300, angle: 90 }));
    perimeter = unwrap(appendClosingSegment(perimeter));
    expect(perimeter.segments[2].length).toBeCloseTo(500);
    expect(isPerimeterClosed(perimeter)).toBe(true);
  });

  it('changing a length shifts the following corners and opens the gap', () => {
    const perimeter = rectanglePerimeter(400, 300);
    const edited = unwrap(updateSegment(perimeter, perimeter.segments[0].id, { length: 410 }));
    expect(perimeterCorners(edited)[2].x).toBeCloseTo(410);
    expect(closureGap(edited)).toBeCloseTo(10);
    expect(perimeter.segments[0].length).toBe(400);
  });

  it('removes a segment and leaves the perimeter open', () => {
    const perimeter = rectanglePerimeter(400, 300);
    const edited = unwrap(removeSegment(perimeter, perimeter.segments[3].id));
    expect(isPerimeterClosed(edited)).toBe(false);
  });
});

describe('moveSegment', () => {
  it('moves the right wall of a rectangle inwards and shortens its neighbours', () => {
    const perimeter = rectanglePerimeter(400, 300);
    const moved = unwrap(moveSegment(perimeter, perimeter.segments[1].id, 50));
    expect(moved.segments[0].length).toBeCloseTo(350);
    expect(moved.segments[1].length).toBeCloseTo(300);
    expect(moved.segments[2].length).toBeCloseTo(350);
    expect(closureGap(moved)).toBeCloseTo(0);
  });

  it('moves outwards with a negative offset', () => {
    const perimeter = rectanglePerimeter(400, 300);
    const moved = unwrap(moveSegment(perimeter, perimeter.segments[1].id, -50));
    expect(moved.segments[0].length).toBeCloseTo(450);
    expect(moved.segments[2].length).toBeCloseTo(450);
  });

  it('moves the first segment of a closed perimeter, updating start and last segment', () => {
    const perimeter = rectanglePerimeter(400, 300);
    const moved = unwrap(moveSegment(perimeter, perimeter.segments[0].id, 20));
    expect(moved.start.y).toBeCloseTo(20);
    expect(moved.segments[3].length).toBeCloseTo(280);
    expect(moved.segments[1].length).toBeCloseTo(280);
    expect(closureGap(moved)).toBeCloseTo(0);
  });

  it('works on non-rectangular shapes', () => {
    const perimeter = lShapePerimeter();
    const moved = unwrap(moveSegment(perimeter, perimeter.segments[2].id, -50));
    // The inner horizontal wall (y = 200) moves down to y = 250.
    expect(perimeterCorners(moved)[2].y).toBeCloseTo(250);
    expect(moved.segments[1].length).toBeCloseTo(250);
    expect(moved.segments[3].length).toBeCloseTo(150);
    expect(closureGap(moved)).toBeCloseTo(0);
  });

  it('moves the free end of an open chain as a whole', () => {
    let perimeter = createPerimeter();
    perimeter = unwrap(appendSegment(perimeter, { length: 400, angle: 0 }));
    perimeter = unwrap(appendSegment(perimeter, { length: 300, angle: 90 }));
    const moved = unwrap(moveSegment(perimeter, perimeter.segments[1].id, 30));
    expect(moved.segments[0].length).toBeCloseTo(370);
    expect(moved.segments[1].length).toBeCloseTo(300);
  });

  it('rejects moves that would collapse a neighbour', () => {
    const perimeter = rectanglePerimeter(400, 300);
    expect(moveSegment(perimeter, perimeter.segments[1].id, 400)).toEqual({
      ok: false,
      error: 'SEGMENT_NOT_MOVABLE',
    });
  });
});

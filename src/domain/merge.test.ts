import { describe, expect, it } from 'vitest';
import { mergeCollinearSegments } from './merge';
import { appendSegment, closureGap, createPerimeter, perimeterCorners } from './perimeter';
import { unwrap } from './result';
import { rectanglePerimeter } from './test-fixtures';
import type { Floor, Perimeter } from './types';

function floorOf(perimeter: Perimeter, openings: Floor['openings'] = []): Floor {
  return { perimeter, partitions: [], openings, furniture: [], zones: [] };
}

function build(steps: { length: number; angle: number }[]): Perimeter {
  let perimeter = createPerimeter();
  for (const step of steps) perimeter = unwrap(appendSegment(perimeter, step));
  return perimeter;
}

describe('mergeCollinearSegments', () => {
  it('joins consecutive segments going the same way', () => {
    const perimeter = build([
      { length: 200, angle: 0 },
      { length: 150, angle: 0 },
      { length: 300, angle: 90 },
    ]);
    const merged = mergeCollinearSegments(floorOf(perimeter)).perimeter;
    expect(merged.segments.map((s) => s.length)).toEqual([350, 300]);
    expect(merged.segments[0].id).toBe(perimeter.segments[0].id);
  });

  it('keeps openings on the absorbed segment at the same place', () => {
    const perimeter = build([
      { length: 200, angle: 0 },
      { length: 150, angle: 0 },
    ]);
    const door = {
      id: 'd1',
      wallId: perimeter.segments[1].id,
      type: 'door' as const,
      offset: 20,
      width: 80,
      height: 210,
      sillHeight: 0,
    };
    const merged = mergeCollinearSegments(floorOf(perimeter, [door]));
    expect(merged.openings[0]).toMatchObject({ wallId: perimeter.segments[0].id, offset: 220 });
  });

  it('joins the last and first segments of a closed perimeter', () => {
    // Rectangle whose top wall is split in two: the start sits in the middle of it.
    let perimeter = createPerimeter({ x: 200, y: 0 });
    for (const step of [
      { length: 200, angle: 0 },
      { length: 300, angle: 90 },
      { length: 400, angle: 180 },
      { length: 300, angle: 270 },
      { length: 200, angle: 0 },
    ]) {
      perimeter = unwrap(appendSegment(perimeter, step));
    }
    const merged = mergeCollinearSegments(floorOf(perimeter)).perimeter;
    expect(merged.segments.map((s) => s.length)).toEqual([400, 300, 400, 300]);
    expect(merged.start.x).toBeCloseTo(0);
    expect(closureGap(merged)).toBeCloseTo(0);
    expect(perimeterCorners(merged)[1].x).toBeCloseTo(400);
  });

  it('does not touch perimeters without collinear neighbours', () => {
    const floor = floorOf(rectanglePerimeter(400, 300));
    expect(mergeCollinearSegments(floor)).toBe(floor);
  });

  it('does not join segments that go back on themselves', () => {
    const perimeter = build([
      { length: 200, angle: 0 },
      { length: 100, angle: 180 },
    ]);
    expect(mergeCollinearSegments(floorOf(perimeter)).perimeter.segments).toHaveLength(2);
  });
});

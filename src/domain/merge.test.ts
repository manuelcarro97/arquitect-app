import { describe, expect, it } from 'vitest';
import { mergeCollinearPartitions, mergeCollinearSegments } from './merge';
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

describe('mergeCollinearPartitions', () => {
  const props = { thickness: 10, height: 250 };

  function partitionsFloor(partitions: Floor['partitions'], openings: Floor['openings'] = []): Floor {
    return { ...floorOf(rectanglePerimeter(600, 400)), partitions, openings };
  }

  it('joins two partitions that continue on the same line', () => {
    const floor = partitionsFloor([
      { id: 'p1', a: { x: 100, y: 200 }, b: { x: 300, y: 200 }, ...props },
      { id: 'p2', a: { x: 300, y: 200 }, b: { x: 450, y: 200 }, ...props },
    ]);
    const merged = mergeCollinearPartitions(floor).partitions;
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: 'p1', a: { x: 100, y: 200 }, b: { x: 450, y: 200 } });
  });

  it('joins overlapping or reversed partitions and moves their openings', () => {
    const door = { id: 'd', wallId: 'p2', type: 'door' as const, offset: 10, width: 80, height: 210, sillHeight: 0 };
    const floor = partitionsFloor(
      [
        { id: 'p1', a: { x: 100, y: 200 }, b: { x: 300, y: 200 }, ...props },
        // Drawn backwards, overlapping the first one.
        { id: 'p2', a: { x: 500, y: 200 }, b: { x: 250, y: 200 }, ...props },
      ],
      [door],
    );
    const result = mergeCollinearPartitions(floor);
    expect(result.partitions).toHaveLength(1);
    expect(result.partitions[0].b).toEqual({ x: 500, y: 200 });
    // The door spanned x 410..490 on p2; from the merged start (x = 100) that is offset 310.
    expect(result.openings[0]).toMatchObject({ wallId: 'p1', offset: 310 });
  });

  it('leaves perpendicular, separated or different-thickness partitions alone', () => {
    const floor = partitionsFloor([
      { id: 'p1', a: { x: 100, y: 200 }, b: { x: 300, y: 200 }, ...props },
      { id: 'p2', a: { x: 300, y: 200 }, b: { x: 300, y: 350 }, ...props },
      { id: 'p3', a: { x: 350, y: 200 }, b: { x: 500, y: 200 }, ...props },
      { id: 'p4', a: { x: 300, y: 350 }, b: { x: 300, y: 390 }, thickness: 15, height: 250 },
    ]);
    expect(mergeCollinearPartitions(floor)).toBe(floor);
  });
});

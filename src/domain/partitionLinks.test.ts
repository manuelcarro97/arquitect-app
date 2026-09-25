import { describe, expect, it } from 'vitest';
import { movePartitionEndpoint, movePartitionPerpendicular } from './partitionLinks';
import { unwrap } from './result';
import { rectanglePerimeter } from './test-fixtures';
import type { Floor, Partition } from './types';

const props = { thickness: 10, height: 250 };

function floorWith(partitions: Partition[], openings: Floor['openings'] = []): Floor {
  return { perimeter: rectanglePerimeter(600, 400), partitions, openings, furniture: [], zones: [] };
}

function byId(floor: Floor, id: string): Partition {
  return floor.partitions.find((p) => p.id === id)!;
}

function expectPoint(actual: { x: number; y: number }, x: number, y: number) {
  expect(actual.x).toBeCloseTo(x);
  expect(actual.y).toBeCloseTo(y);
}

describe('movePartitionPerpendicular', () => {
  it('keeps an L-shaped chain joined and slides the free end along the outer wall', () => {
    const floor = floorWith([
      { id: 'h', a: { x: 0, y: 200 }, b: { x: 300, y: 200 }, ...props },
      { id: 'v', a: { x: 300, y: 200 }, b: { x: 300, y: 400 }, ...props },
    ]);
    // Normal of 'v' (pointing down) is (-1, 0): a negative offset moves it right.
    const moved = unwrap(movePartitionPerpendicular(floor, 'v', -50));
    expectPoint(byId(moved, 'v').a, 350, 200);
    expectPoint(byId(moved, 'v').b, 350, 400);
    expectPoint(byId(moved, 'h').b, 350, 200);
    expectPoint(byId(moved, 'h').a, 0, 200);
  });

  it('stretches partitions that end on it (T-junction)', () => {
    const floor = floorWith([
      { id: 'h', a: { x: 0, y: 200 }, b: { x: 600, y: 200 }, ...props },
      { id: 't', a: { x: 300, y: 200 }, b: { x: 300, y: 400 }, ...props },
    ]);
    const moved = unwrap(movePartitionPerpendicular(floor, 'h', 50));
    expectPoint(byId(moved, 'h').a, 0, 250);
    expectPoint(byId(moved, 'h').b, 600, 250);
    expectPoint(byId(moved, 't').a, 300, 250);
    expectPoint(byId(moved, 't').b, 300, 400);
  });

  it('keeps openings of a partition whose start slid at the same place on the plan', () => {
    const door = { id: 'd', wallId: 'v', type: 'door' as const, offset: 50, width: 80, height: 210, sillHeight: 0 };
    const floor = floorWith(
      [
        { id: 'h', a: { x: 0, y: 200 }, b: { x: 600, y: 200 }, ...props },
        { id: 'v', a: { x: 300, y: 200 }, b: { x: 300, y: 400 }, ...props },
      ],
      [door],
    );
    // Moving 'h' down 50 shortens 'v' from its start: the door (at y 250..330) keeps its place → offset 0.
    const moved = unwrap(movePartitionPerpendicular(floor, 'h', 50));
    expect(moved.openings[0].offset).toBeCloseTo(0);
  });

  it('rejects the whole move if a linked partition would collapse', () => {
    const floor = floorWith([
      { id: 'h', a: { x: 0, y: 200 }, b: { x: 600, y: 200 }, ...props },
      { id: 't', a: { x: 300, y: 200 }, b: { x: 300, y: 260 }, ...props },
    ]);
    expect(movePartitionPerpendicular(floor, 'h', 100).ok).toBe(false);
  });
});

describe('movePartitionEndpoint', () => {
  it('drags the shared corner of a chain with both partitions', () => {
    const floor = floorWith([
      { id: 'h', a: { x: 0, y: 200 }, b: { x: 300, y: 200 }, ...props },
      { id: 'v', a: { x: 300, y: 200 }, b: { x: 300, y: 400 }, ...props },
    ]);
    const moved = unwrap(movePartitionEndpoint(floor, 'h', 'b', { x: 300, y: 150 }));
    expectPoint(byId(moved, 'h').b, 300, 150);
    expectPoint(byId(moved, 'v').a, 300, 150);
  });

  it('rejects dragging an end outside the perimeter', () => {
    const floor = floorWith([{ id: 'h', a: { x: 0, y: 200 }, b: { x: 300, y: 200 }, ...props }]);
    expect(movePartitionEndpoint(floor, 'h', 'b', { x: 700, y: 200 })).toEqual({
      ok: false,
      error: 'PARTITION_OUTSIDE_PERIMETER',
    });
  });
});

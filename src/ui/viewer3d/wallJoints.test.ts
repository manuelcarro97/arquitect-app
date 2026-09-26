import { describe, expect, it } from 'vitest';
import type { Point, WallGeometry } from '../../domain';
import { wallEnds } from './wallJoints';

function wall(id: string, kind: WallGeometry['kind'], start: Point, end: Point, thickness: number): WallGeometry {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  return { id, kind, start, end, length, thickness, height: 250 };
}

/** 400 × 300 room drawn clockwise on screen (y down), 30 cm walls. Face A points outwards here. */
const room = [
  wall('top', 'perimeter', { x: 0, y: 0 }, { x: 400, y: 0 }, 30),
  wall('right', 'perimeter', { x: 400, y: 0 }, { x: 400, y: 300 }, 30),
  wall('bottom', 'perimeter', { x: 400, y: 300 }, { x: 0, y: 300 }, 30),
  wall('left', 'perimeter', { x: 0, y: 300 }, { x: 0, y: 0 }, 30),
];

function rounded(ends: object | undefined) {
  return Object.fromEntries(Object.entries(ends ?? {}).map(([key, value]) => [key, Math.round(value * 1000) / 1000]));
}

describe('wallEnds', () => {
  it('mitres square perimeter corners: the outer face is longer, the inner face shorter', () => {
    const ends = wallEnds(room, true);
    // Face A of "top" is at y = +15 (outside is y < 0 here, so face A is the inner one).
    expect(rounded(ends.get('top'))).toEqual({ startA: 15, startB: -15, endA: 385, endB: 415 });
    expect(rounded(ends.get('left'))).toEqual({ startA: 15, startB: -15, endA: 285, endB: 315 });
  });

  it('leaves the free ends of an open perimeter square', () => {
    const ends = wallEnds(room.slice(0, 2), false);
    expect(rounded(ends.get('top'))).toEqual({ startA: 0, startB: 0, endA: 385, endB: 415 });
    expect(rounded(ends.get('right'))).toEqual({ startA: 15, startB: -15, endA: 300, endB: 300 });
  });

  it('stops a partition at the inner face of the perimeter wall it starts from', () => {
    const partition = wall('p', 'partition', { x: 200, y: 0 }, { x: 200, y: 300 }, 10);
    const ends = wallEnds([...room, partition], true);
    expect(rounded(ends.get('p'))).toEqual({ startA: 15, startB: 15, endA: 285, endB: 285 });
  });

  it('stops a partition at the face of the partition it rests against (T joint)', () => {
    const across = wall('across', 'partition', { x: 0, y: 150 }, { x: 400, y: 150 }, 10);
    const stem = wall('stem', 'partition', { x: 200, y: 150 }, { x: 200, y: 300 }, 10);
    const ends = wallEnds([...room, across, stem], true);
    expect(rounded(ends.get('stem'))).toEqual({ startA: 5, startB: 5, endA: 135, endB: 135 });
  });

  it('mitres two partitions meeting in an L', () => {
    const first = wall('first', 'partition', { x: 100, y: 100 }, { x: 200, y: 100 }, 10);
    const second = wall('second', 'partition', { x: 200, y: 100 }, { x: 200, y: 200 }, 10);
    const ends = wallEnds([first, second], false);
    expect(rounded(ends.get('first'))).toEqual({ startA: 0, startB: 0, endA: 95, endB: 105 });
    expect(rounded(ends.get('second'))).toEqual({ startA: 5, startB: -5, endA: 100, endB: 100 });
  });
});

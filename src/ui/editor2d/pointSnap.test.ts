import { describe, expect, it } from 'vitest';
import { snapLengthToWalls, snapPoint, type SnapTargets } from './pointSnap';

const targets: SnapTargets = {
  points: [{ x: 0, y: 0 }],
  segments: [
    { a: { x: 0, y: 0 }, b: { x: 400, y: 0 } },
    { a: { x: 400, y: 0 }, b: { x: 400, y: 300 } },
  ],
};

describe('snapPoint', () => {
  it('prefers corners, then walls, then the grid', () => {
    expect(snapPoint({ x: 3, y: 4 }, targets, 10, 5)).toEqual({ point: { x: 0, y: 0 }, kind: 'point' });
    expect(snapPoint({ x: 200, y: 6 }, targets, 10, 5)).toEqual({ point: { x: 200, y: 0 }, kind: 'segment' });
    expect(snapPoint({ x: 201, y: 52 }, targets, 10, 5)).toEqual({ point: { x: 200, y: 50 }, kind: 'grid' });
  });
});

describe('snapLengthToWalls', () => {
  it('stretches a vertical partition to the wall it almost reaches', () => {
    const result = snapLengthToWalls({ x: 200, y: 300 }, 270, 293, targets.segments, 10);
    expect(result.snapped).toBe(true);
    expect(result.length).toBeCloseTo(300);
    expect(result.end.y).toBeCloseTo(0);
  });

  it('keeps the length when no wall is close', () => {
    const result = snapLengthToWalls({ x: 200, y: 300 }, 270, 150, targets.segments, 10);
    expect(result).toMatchObject({ length: 150, snapped: false });
  });
});

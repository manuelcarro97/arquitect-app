import { describe, expect, it } from 'vitest';
import {
  angleBetween,
  distance,
  lineIntersection,
  normalizeAngle,
  pointFromPolar,
  pointInPolygon,
  polygonArea,
  segmentInsidePolygon,
  segmentsProperlyIntersect,
  squareCmToSquareM,
} from './geometry';
import type { Point } from './types';

const square: Point[] = [
  { x: 0, y: 0 },
  { x: 400, y: 0 },
  { x: 400, y: 300 },
  { x: 0, y: 300 },
];

// L shape: 400x400 with the bottom-right 200x200 quadrant removed.
const lShape: Point[] = [
  { x: 0, y: 0 },
  { x: 400, y: 0 },
  { x: 400, y: 200 },
  { x: 200, y: 200 },
  { x: 200, y: 400 },
  { x: 0, y: 400 },
];

// U shape: 300x300 with a 100-wide gap open at the bottom (y = 300).
const uShape: Point[] = [
  { x: 0, y: 0 },
  { x: 300, y: 0 },
  { x: 300, y: 300 },
  { x: 200, y: 300 },
  { x: 200, y: 100 },
  { x: 100, y: 100 },
  { x: 100, y: 300 },
  { x: 0, y: 300 },
];

describe('angles and polar coordinates', () => {
  it('normalizes angles into [0, 360)', () => {
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(450)).toBe(90);
  });

  it('builds points from length and angle (90° points down on screen)', () => {
    const p = pointFromPolar({ x: 0, y: 0 }, 100, 90);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(100);
  });

  it('measures distance and angle between points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 300, y: 400 })).toBe(500);
    expect(angleBetween({ x: 0, y: 0 }, { x: -10, y: 0 })).toBeCloseTo(180);
  });
});

describe('polygonArea', () => {
  it('computes rectangle area in cm²', () => {
    expect(polygonArea(square)).toBe(120_000);
    expect(squareCmToSquareM(polygonArea(square))).toBe(12);
  });

  it('computes irregular (L) polygon area regardless of orientation', () => {
    expect(polygonArea(lShape)).toBe(120_000);
    expect(polygonArea([...lShape].reverse())).toBe(120_000);
  });
});

describe('pointInPolygon', () => {
  it('detects inside, outside and boundary points', () => {
    expect(pointInPolygon({ x: 100, y: 100 }, lShape)).toBe(true);
    expect(pointInPolygon({ x: 300, y: 300 }, lShape)).toBe(false);
    expect(pointInPolygon({ x: 400, y: 100 }, lShape)).toBe(true);
    expect(pointInPolygon({ x: 200, y: 200 }, lShape)).toBe(true);
  });
});

describe('segmentsProperlyIntersect', () => {
  it('is true only when segments cross at an interior point', () => {
    expect(
      segmentsProperlyIntersect({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 }),
    ).toBe(true);
    expect(
      segmentsProperlyIntersect({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }),
    ).toBe(false);
  });
});

describe('segmentInsidePolygon', () => {
  it('accepts a segment fully inside', () => {
    expect(segmentInsidePolygon({ x: 50, y: 50 }, { x: 350, y: 50 }, lShape)).toBe(true);
  });

  it('accepts a segment touching a reflex corner from inside', () => {
    expect(segmentInsidePolygon({ x: 300, y: 100 }, { x: 100, y: 300 }, lShape)).toBe(true);
  });

  it('rejects a segment with an endpoint outside', () => {
    expect(segmentInsidePolygon({ x: 100, y: 100 }, { x: 300, y: 300 }, lShape)).toBe(false);
  });

  it('rejects a segment that crosses out and back in', () => {
    expect(segmentInsidePolygon({ x: 350, y: 150 }, { x: 150, y: 350 }, lShape)).toBe(false);
  });

  it('rejects a segment that leaves only through vertices', () => {
    expect(segmentInsidePolygon({ x: 50, y: 300 }, { x: 250, y: 300 }, uShape)).toBe(false);
  });
});

describe('lineIntersection', () => {
  it('intersects two non-parallel lines', () => {
    const hit = lineIntersection({ x: 0, y: 50 }, { x: 1, y: 0 }, { x: 20, y: 0 }, { x: 0, y: 1 });
    expect(hit).not.toBeNull();
    expect(hit!.x).toBeCloseTo(20);
    expect(hit!.y).toBeCloseTo(50);
  });

  it('returns null for parallel lines', () => {
    expect(lineIntersection({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 5 }, { x: 1, y: 0 })).toBeNull();
  });
});

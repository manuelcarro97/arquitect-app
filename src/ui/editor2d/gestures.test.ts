import { describe, expect, it } from 'vitest';
import { pinchViewport } from './gestures';
import { MAX_SCALE } from './viewport';

const start = { scale: 1, x: 0, y: 0 };

describe('pinchViewport', () => {
  it('pans when both fingers move the same way', () => {
    const result = pinchViewport(start, [{ x: 100, y: 100 }, { x: 200, y: 100 }], [{ x: 130, y: 90 }, { x: 230, y: 90 }]);
    expect(result).toEqual({ scale: 1, x: 30, y: -10 });
  });

  it('zooms around the point between the fingers', () => {
    const result = pinchViewport(start, [{ x: 100, y: 100 }, { x: 200, y: 100 }], [{ x: 50, y: 100 }, { x: 250, y: 100 }]);
    expect(result.scale).toBe(2);
    // The world point that was between the fingers (150, 100) is still there.
    expect(150 * result.scale + result.x).toBeCloseTo(150);
    expect(100 * result.scale + result.y).toBeCloseTo(100);
  });

  it('respects the zoom limits', () => {
    const result = pinchViewport(
      { scale: MAX_SCALE, x: 0, y: 0 },
      [{ x: 100, y: 100 }, { x: 110, y: 100 }],
      [{ x: 0, y: 100 }, { x: 400, y: 100 }],
    );
    expect(result.scale).toBe(MAX_SCALE);
  });
});

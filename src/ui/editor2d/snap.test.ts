import { describe, expect, it } from 'vitest';
import { alignWithCorners, computeDrawPreview } from './snap';

const corners = [
  { x: 0, y: 0 },
  { x: 400, y: 0 },
  { x: 400, y: 300 },
];

describe('alignWithCorners', () => {
  it('snaps a horizontal segment to the x of an existing corner and shows a guide', () => {
    // Drawing leftwards from (400, 300); pointer near x = 0 aligns with the start corner above.
    const preview = computeDrawPreview({ x: 400, y: 300 }, { x: 4, y: 302 }, { angleStep: 90, typedLength: null })!;
    const { preview: aligned, guides } = alignWithCorners(preview, corners, { tolerance: 8, snap: true });
    expect(aligned.length).toBeCloseTo(400);
    expect(aligned.to.x).toBeCloseTo(0);
    expect(guides.map((g) => g.from)).toContainEqual({ x: 0, y: 0 });
  });

  it('does not snap when the pointer is far from any alignment', () => {
    const preview = computeDrawPreview({ x: 400, y: 300 }, { x: 200, y: 300 }, { angleStep: 90, typedLength: null })!;
    const { preview: aligned, guides } = alignWithCorners(preview, corners, { tolerance: 8, snap: true });
    expect(aligned.length).toBe(200);
    expect(guides).toHaveLength(0);
  });

  it('never overrides a typed length', () => {
    const preview = computeDrawPreview({ x: 400, y: 300 }, { x: 10, y: 300 }, { angleStep: 90, typedLength: 395 })!;
    const { preview: aligned, guides } = alignWithCorners(preview, corners, { tolerance: 8, snap: false });
    expect(aligned.length).toBe(395);
    expect(guides).toHaveLength(0);
  });
});

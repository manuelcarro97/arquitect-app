import { describe, expect, it } from 'vitest';
import type { Opening, WallGeometry } from '../../domain';
import { wallPieces } from './wallPieces';

const wall: WallGeometry = {
  id: 'w1',
  kind: 'perimeter',
  start: { x: 0, y: 0 },
  end: { x: 400, y: 0 },
  length: 400,
  thickness: 30,
  height: 250,
};

function opening(overrides: Partial<Opening>): Opening {
  return { id: 'o', wallId: 'w1', type: 'window', offset: 100, width: 120, height: 100, sillHeight: 100, ...overrides };
}

describe('wallPieces', () => {
  it('returns one full box for a wall without openings, extended at both ends', () => {
    expect(wallPieces(wall, [], 15)).toEqual([{ from: -15, to: 415, bottom: 0, top: 250 }]);
  });

  it('splits around a window: left, sill, lintel, right', () => {
    expect(wallPieces(wall, [opening({})])).toEqual([
      { from: 0, to: 100, bottom: 0, top: 250 },
      { from: 100, to: 220, bottom: 0, top: 100 },
      { from: 100, to: 220, bottom: 200, top: 250 },
      { from: 220, to: 400, bottom: 0, top: 250 },
    ]);
  });

  it('has no sill piece for doors and ignores openings of other walls', () => {
    const door = opening({ type: 'door', offset: 0, width: 82, height: 210, sillHeight: 0 });
    const elsewhere = opening({ wallId: 'other' });
    expect(wallPieces(wall, [door, elsewhere])).toEqual([
      { from: 0, to: 82, bottom: 210, top: 250 },
      { from: 82, to: 400, bottom: 0, top: 250 },
    ]);
  });

  it('handles openings in any order', () => {
    const pieces = wallPieces(wall, [opening({ id: 'b', offset: 300, width: 50 }), opening({ id: 'a', offset: 50, width: 50 })]);
    const fullHeight = pieces.filter((p) => p.bottom === 0 && p.top === 250);
    expect(fullHeight.map((p) => [p.from, p.to])).toEqual([
      [0, 50],
      [100, 300],
      [350, 400],
    ]);
  });
});

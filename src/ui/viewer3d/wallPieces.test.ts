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

/** Piece with both faces spanning the same stretch. */
function span(from: number, to: number, bottom: number, top: number) {
  return { fromA: from, fromB: from, toA: to, toB: to, bottom, top };
}

describe('wallPieces', () => {
  it('returns one full block for a wall without openings, with each face cut at its own length', () => {
    const ends = { startA: -15, startB: 15, endA: 415, endB: 385 };
    expect(wallPieces(wall, [], ends)).toEqual([{ fromA: -15, fromB: 15, toA: 415, toB: 385, bottom: 0, top: 250 }]);
  });

  it('splits around a window: left, sill, lintel, right', () => {
    expect(wallPieces(wall, [opening({})])).toEqual([
      span(0, 100, 0, 250),
      span(100, 220, 0, 100),
      span(100, 220, 200, 250),
      span(220, 400, 0, 250),
    ]);
  });

  it('keeps the mitred corners on the blocks next to the wall ends', () => {
    const ends = { startA: -15, startB: 15, endA: 415, endB: 385 };
    const pieces = wallPieces(wall, [opening({})], ends);
    expect(pieces[0]).toEqual({ fromA: -15, fromB: 15, toA: 100, toB: 100, bottom: 0, top: 250 });
    expect(pieces[pieces.length - 1]).toEqual({ fromA: 220, fromB: 220, toA: 415, toB: 385, bottom: 0, top: 250 });
  });

  it('has no sill piece for doors and ignores openings of other walls', () => {
    const door = opening({ type: 'door', offset: 0, width: 82, height: 210, sillHeight: 0 });
    const elsewhere = opening({ wallId: 'other' });
    expect(wallPieces(wall, [door, elsewhere])).toEqual([span(0, 82, 210, 250), span(82, 400, 0, 250)]);
  });

  it('handles openings in any order', () => {
    const pieces = wallPieces(wall, [opening({ id: 'b', offset: 300, width: 50 }), opening({ id: 'a', offset: 50, width: 50 })]);
    const fullHeight = pieces.filter((p) => p.bottom === 0 && p.top === 250);
    expect(fullHeight.map((p) => [p.fromA, p.toA])).toEqual([
      [0, 50],
      [100, 300],
      [350, 400],
    ]);
  });
});

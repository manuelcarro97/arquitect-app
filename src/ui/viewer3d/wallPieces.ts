import type { Opening, WallGeometry } from '../../domain';
import { squareEnds, type WallEnds } from './wallJoints';

/**
 * A solid block of a wall, in cm along the wall (0 = wall start) and height (`bottom`/`top`).
 * Face A spans `fromA`..`toA` and face B `fromB`..`toB`: they differ only at mitred corners.
 */
export interface WallPiece {
  fromA: number;
  fromB: number;
  toA: number;
  toB: number;
  bottom: number;
  top: number;
}

/**
 * Splits a wall into solid blocks around its openings (no boolean geometry needed):
 * full-height blocks between openings, plus the part under each window (sill) and above each opening (lintel).
 * `ends` gives where each face starts and ends, so corners can be cut at an angle.
 */
export function wallPieces(wall: WallGeometry, openings: Opening[], ends: WallEnds = squareEnds(wall)): WallPiece[] {
  const onWall = openings
    .filter((opening) => opening.wallId === wall.id)
    .sort((a, b) => a.offset - b.offset);
  const wallEnd = Math.max(ends.endA, ends.endB);

  const pieces: WallPiece[] = [];
  let cursor = { a: ends.startA, b: ends.startB };
  const pushSolid = (toA: number, toB: number) => {
    const piece = {
      fromA: cursor.a,
      fromB: cursor.b,
      toA: Math.max(toA, cursor.a),
      toB: Math.max(toB, cursor.b),
      bottom: 0,
      top: wall.height,
    };
    if (piece.toA > piece.fromA || piece.toB > piece.fromB) pieces.push(piece);
  };

  for (const opening of onWall) {
    const openingStart = Math.max(opening.offset, Math.min(cursor.a, cursor.b));
    const openingEnd = Math.min(opening.offset + opening.width, wallEnd);
    if (openingEnd <= openingStart) continue;

    pushSolid(openingStart, openingStart);
    const span = { fromA: openingStart, fromB: openingStart, toA: openingEnd, toB: openingEnd };
    if (opening.sillHeight > 0) pieces.push({ ...span, bottom: 0, top: Math.min(opening.sillHeight, wall.height) });
    const lintel = opening.sillHeight + opening.height;
    if (lintel < wall.height) pieces.push({ ...span, bottom: lintel, top: wall.height });
    cursor = { a: Math.max(openingEnd, cursor.a), b: Math.max(openingEnd, cursor.b) };
  }
  pushSolid(ends.endA, ends.endB);
  return pieces;
}

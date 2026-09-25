import type { Opening, WallGeometry } from '../../domain';

/** A solid box of a wall, in cm along the wall (`from`/`to`, 0 = wall start) and height (`bottom`/`top`). */
export interface WallPiece {
  from: number;
  to: number;
  bottom: number;
  top: number;
}

/**
 * Splits a wall into solid boxes around its openings (no boolean geometry needed):
 * full-height pieces between openings, plus the part under each window (sill) and above each opening (lintel).
 * `extension` lengthens the wall at both ends so perimeter corners close without gaps.
 */
export function wallPieces(wall: WallGeometry, openings: Opening[], extension = 0): WallPiece[] {
  const start = 0 - extension; // not `-extension`, which gives -0 when there is no extension
  const end = wall.length + extension;
  const onWall = openings
    .filter((opening) => opening.wallId === wall.id)
    .sort((a, b) => a.offset - b.offset);

  const pieces: WallPiece[] = [];
  let cursor = start;
  for (const opening of onWall) {
    const openingStart = Math.max(opening.offset, cursor);
    const openingEnd = Math.min(opening.offset + opening.width, end);
    if (openingEnd <= openingStart) continue;

    if (openingStart > cursor) pieces.push({ from: cursor, to: openingStart, bottom: 0, top: wall.height });
    if (opening.sillHeight > 0) {
      pieces.push({ from: openingStart, to: openingEnd, bottom: 0, top: Math.min(opening.sillHeight, wall.height) });
    }
    const lintel = opening.sillHeight + opening.height;
    if (lintel < wall.height) pieces.push({ from: openingStart, to: openingEnd, bottom: lintel, top: wall.height });
    cursor = openingEnd;
  }
  if (cursor < end) pieces.push({ from: cursor, to: end, bottom: 0, top: wall.height });
  return pieces;
}

import { EPSILON } from './geometry';
import { createId } from './ids';
import { err, ok, type DomainError, type Result } from './result';
import type { Floor, Id, Opening } from './types';
import { findWall } from './walls';

export type OpeningInput = Omit<Opening, 'id'>;

/** Returns why the opening cannot be placed, or null if it fits. */
export function validateOpening(floor: Floor, opening: OpeningInput, ignoreId?: Id): DomainError | null {
  const wall = findWall(floor, opening.wallId);
  if (!wall) return 'WALL_NOT_FOUND';
  if (opening.width <= 0 || opening.height <= 0 || opening.offset < 0 || opening.sillHeight < 0) {
    return 'INVALID_OPENING_SIZE';
  }
  if (opening.offset + opening.width > wall.length + EPSILON) return 'OPENING_OUT_OF_WALL';
  if (opening.sillHeight + opening.height > wall.height + EPSILON) return 'OPENING_OUT_OF_WALL';
  const overlaps = floor.openings.some(
    (other) =>
      other.id !== ignoreId &&
      other.wallId === opening.wallId &&
      other.offset < opening.offset + opening.width &&
      opening.offset < other.offset + other.width,
  );
  return overlaps ? 'OPENING_OVERLAP' : null;
}

export function addOpening(floor: Floor, input: OpeningInput): Result<Floor> {
  const error = validateOpening(floor, input);
  if (error) return err(error);
  return ok({ ...floor, openings: [...floor.openings, { ...input, id: createId() }] });
}

export function updateOpening(floor: Floor, openingId: Id, changes: Partial<OpeningInput>): Result<Floor> {
  const current = floor.openings.find((opening) => opening.id === openingId);
  if (!current) return err('OPENING_NOT_FOUND');
  const updated: Opening = { ...current, ...changes };
  const error = validateOpening(floor, updated, openingId);
  if (error) return err(error);
  return ok({
    ...floor,
    openings: floor.openings.map((opening) => (opening.id === openingId ? updated : opening)),
  });
}

export function removeOpening(floor: Floor, openingId: Id): Floor {
  return { ...floor, openings: floor.openings.filter((opening) => opening.id !== openingId) };
}

export function removeOpeningsOnWall(floor: Floor, wallId: Id): Floor {
  return { ...floor, openings: floor.openings.filter((opening) => opening.wallId !== wallId) };
}

/** Openings that became invalid after their wall changed (shown as warnings in the UI). */
export function invalidOpeningIds(floor: Floor): Id[] {
  return floor.openings
    .filter((opening) => validateOpening(floor, opening, opening.id) !== null)
    .map((opening) => opening.id);
}

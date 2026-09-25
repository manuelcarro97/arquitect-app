export type DomainError =
  | 'INVALID_LENGTH'
  | 'INVALID_NAME'
  | 'NOT_ENOUGH_SEGMENTS'
  | 'PERIMETER_ALREADY_CLOSED'
  | 'PERIMETER_NOT_CLOSED'
  | 'SEGMENT_NOT_FOUND'
  | 'SEGMENT_NOT_MOVABLE'
  | 'PARTITION_NOT_FOUND'
  | 'PARTITION_OUTSIDE_PERIMETER'
  | 'WALL_NOT_FOUND'
  | 'OPENING_NOT_FOUND'
  | 'INVALID_OPENING_SIZE'
  | 'OPENING_OUT_OF_WALL'
  | 'OPENING_OVERLAP'
  | 'ZONE_NOT_FOUND'
  | 'INVALID_ZONE'
  | 'VERSION_NOT_FOUND'
  | 'LAST_VERSION'
  | 'FURNITURE_NOT_FOUND';

export type Result<T> = { ok: true; value: T } | { ok: false; error: DomainError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T = never>(error: DomainError): Result<T> {
  return { ok: false, error };
}

/** Returns the value or throws. Intended for tests and for callers that already validated. */
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(`Expected ok result, got error ${result.error}`);
  }
  return result.value;
}

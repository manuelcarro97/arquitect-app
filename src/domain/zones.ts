import { EPSILON, polygonArea, squareCmToSquareM } from './geometry';
import { createId } from './ids';
import { err, ok, type DomainError, type Result } from './result';
import type { Floor, Id, MaterialId, Point, Zone } from './types';

export interface ZoneInput {
  name: string;
  color: string;
  points: Point[];
  floorFinish?: MaterialId;
}

function zoneError(zone: ZoneInput): DomainError | null {
  if (zone.name.trim() === '') return 'INVALID_NAME';
  if (zone.points.length < 3 || polygonArea(zone.points) < EPSILON) return 'INVALID_ZONE';
  return null;
}

export function addZone(floor: Floor, input: ZoneInput): Result<Floor> {
  const error = zoneError(input);
  if (error) return err(error);
  return ok({ ...floor, zones: [...floor.zones, { ...input, id: createId() }] });
}

export function updateZone(floor: Floor, zoneId: Id, changes: Partial<ZoneInput>): Result<Floor> {
  const current = floor.zones.find((zone) => zone.id === zoneId);
  if (!current) return err('ZONE_NOT_FOUND');
  const updated: Zone = { ...current, ...changes };
  const error = zoneError(updated);
  if (error) return err(error);
  return ok({ ...floor, zones: floor.zones.map((zone) => (zone.id === zoneId ? updated : zone)) });
}

export function removeZone(floor: Floor, zoneId: Id): Floor {
  return { ...floor, zones: floor.zones.filter((zone) => zone.id !== zoneId) };
}

export function zoneAreaM2(zone: Zone): number {
  return squareCmToSquareM(polygonArea(zone.points));
}

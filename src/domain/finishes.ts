import { pointInPolygon } from './geometry';
import { pointInFrontOf } from './openingGeometry';
import { err, ok, type Result } from './result';
import type { Floor, Id, MaterialId, WallGeometry, WallSide, Zone } from './types';
import { getWalls } from './walls';

/** Sets (or clears, with null) the finish of one face of a perimeter wall or partition. */
export function setWallFinish(floor: Floor, wallId: Id, side: WallSide, material: MaterialId | null): Result<Floor> {
  const key = side === 'A' ? 'finishA' : 'finishB';
  const value = material ?? undefined;
  if (floor.perimeter.segments.some((segment) => segment.id === wallId)) {
    return ok({
      ...floor,
      perimeter: {
        ...floor.perimeter,
        segments: floor.perimeter.segments.map((segment) => (segment.id === wallId ? { ...segment, [key]: value } : segment)),
      },
    });
  }
  if (floor.partitions.some((partition) => partition.id === wallId)) {
    return ok({
      ...floor,
      partitions: floor.partitions.map((partition) => (partition.id === wallId ? { ...partition, [key]: value } : partition)),
    });
  }
  return err('WALL_NOT_FOUND');
}

/** Floor finish used wherever no zone sets its own. */
export function setDefaultFloorFinish(floor: Floor, material: MaterialId | null): Floor {
  return { ...floor, floorFinish: material ?? undefined };
}

/** Fractions along a wall where we look at which room each face faces. */
const PROBES = [0.2, 0.5, 0.8];

/**
 * Wall faces that face into a zone: some point just in front of the face (at 20%, 50% or 80% of the wall)
 * lies inside the zone polygon.
 */
export function wallFacesInZone(floor: Floor, zone: Zone): { wall: WallGeometry; side: WallSide }[] {
  const faces: { wall: WallGeometry; side: WallSide }[] = [];
  for (const wall of getWalls(floor)) {
    if (wall.length <= 0) continue;
    for (const side of ['A', 'B'] as const) {
      const facesZone = PROBES.some((t) => {
        const middle = pointInFrontOf(wall, side, wall.thickness / 2 + 5);
        const direction = { x: (wall.end.x - wall.start.x) / wall.length, y: (wall.end.y - wall.start.y) / wall.length };
        const shift = (t - 0.5) * wall.length;
        return pointInPolygon({ x: middle.x + direction.x * shift, y: middle.y + direction.y * shift }, zone.points);
      });
      if (facesZone) faces.push({ wall, side });
    }
  }
  return faces;
}

/** Paints every wall face of a zone with one material. */
export function setZoneWallsFinish(floor: Floor, zoneId: Id, material: MaterialId | null): Result<Floor> {
  const zone = floor.zones.find((z) => z.id === zoneId);
  if (!zone) return err('ZONE_NOT_FOUND');
  let result = floor;
  for (const { wall, side } of wallFacesInZone(floor, zone)) {
    const updated = setWallFinish(result, wall.id, side, material);
    if (updated.ok) result = updated.value;
  }
  return ok(result);
}

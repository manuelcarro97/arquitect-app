import { normalizeAngle, pointInPolygon, toRadians } from './geometry';
import { createId } from './ids';
import { perimeterPolygon } from './perimeter';
import { err, ok, type Result } from './result';
import type { Floor, Furniture, Id, Point, WallGeometry } from './types';

export type FurnitureInput = Omit<Furniture, 'id'>;

function validSize(item: Pick<Furniture, 'width' | 'depth' | 'height'>): boolean {
  return item.width > 0 && item.depth > 0 && item.height > 0;
}

export function addFurniture(floor: Floor, input: FurnitureInput): Result<Floor> {
  if (!validSize(input)) return err('INVALID_LENGTH');
  const item: Furniture = { ...input, rotation: normalizeAngle(input.rotation), id: createId() };
  return ok({ ...floor, furniture: [...floor.furniture, item] });
}

export function updateFurniture(floor: Floor, furnitureId: Id, changes: Partial<FurnitureInput>): Result<Floor> {
  const current = floor.furniture.find((item) => item.id === furnitureId);
  if (!current) return err('FURNITURE_NOT_FOUND');
  const updated: Furniture = { ...current, ...changes, rotation: normalizeAngle(changes.rotation ?? current.rotation) };
  if (!validSize(updated)) return err('INVALID_LENGTH');
  return ok({ ...floor, furniture: floor.furniture.map((item) => (item.id === furnitureId ? updated : item)) });
}

export function removeFurniture(floor: Floor, furnitureId: Id): Floor {
  return { ...floor, furniture: floor.furniture.filter((item) => item.id !== furnitureId) };
}

/**
 * Local axes of a piece: `side` runs along its width, `front` along its depth towards the front.
 * With rotation 0 the back faces up on the plan (-y) and the front faces down (+y).
 */
export function furnitureAxes(rotation: number): { side: Point; front: Point } {
  const radians = toRadians(rotation);
  return {
    side: { x: Math.cos(radians), y: Math.sin(radians) },
    front: { x: -Math.sin(radians), y: Math.cos(radians) },
  };
}

/** Corners of the footprint: back-left, back-right, front-right, front-left. */
export function furnitureCorners(item: Pick<Furniture, 'x' | 'y' | 'width' | 'depth' | 'rotation'>): Point[] {
  const { side, front } = furnitureAxes(item.rotation);
  const corner = (s: number, f: number): Point => ({
    x: item.x + side.x * s * (item.width / 2) + front.x * f * (item.depth / 2),
    y: item.y + side.y * s * (item.width / 2) + front.y * f * (item.depth / 2),
  });
  return [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
}

/** Pieces with some corner outside the closed perimeter (shown as warnings). */
export function furnitureOutsideIds(floor: Floor): Id[] {
  const polygon = perimeterPolygon(floor.perimeter);
  if (!polygon) return [];
  return floor.furniture
    .filter((item) => furnitureCorners(item).some((corner) => !pointInPolygon(corner, polygon)))
    .map((item) => item.id);
}

/** Axis of the piece counts as parallel to a wall when this close (|cos| of the angle). */
const ALIGNED_TOLERANCE = 0.02;

interface WallSnap {
  wallId: Id;
  normal: Point;
  shift: Point;
  gap: number;
}

/**
 * Pulls a piece flush against the nearest wall face(s) when its edge is within `tolerance` cm
 * and it is square to the wall: one wall, or two in a corner. Returns the new centre.
 */
export function snapFurnitureToWalls(
  item: Pick<Furniture, 'x' | 'y' | 'width' | 'depth' | 'rotation'>,
  walls: WallGeometry[],
  tolerance: number,
): { x: number; y: number; wallIds: Id[] } {
  const { side, front } = furnitureAxes(item.rotation);

  const snapsFor = (center: Point): WallSnap[] =>
    walls
      .flatMap((wall): WallSnap[] => {
        const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
        if (length <= 0) return [];
        const direction = { x: (wall.end.x - wall.start.x) / length, y: (wall.end.y - wall.start.y) / length };
        const normal = { x: -direction.y, y: direction.x };
        const alongSide = Math.abs(normal.x * side.x + normal.y * side.y);
        const alongFront = Math.abs(normal.x * front.x + normal.y * front.y);
        if (alongSide > ALIGNED_TOLERANCE && alongFront > ALIGNED_TOLERANCE) return [];
        const relative = { x: center.x - wall.start.x, y: center.y - wall.start.y };
        const along = relative.x * direction.x + relative.y * direction.y;
        if (along < 0 || along > length) return [];
        const across = relative.x * normal.x + relative.y * normal.y;
        const extent = alongSide * (item.width / 2) + alongFront * (item.depth / 2);
        const gap = Math.abs(across) - wall.thickness / 2 - extent;
        if (Math.abs(gap) > tolerance) return [];
        const towardsWall = across > 0 ? -1 : 1;
        return [{ wallId: wall.id, normal, gap, shift: { x: normal.x * towardsWall * gap, y: normal.y * towardsWall * gap } }];
      })
      .sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap));

  let center: Point = { x: item.x, y: item.y };
  const first = snapsFor(center)[0];
  if (!first) return { ...center, wallIds: [] };
  center = { x: center.x + first.shift.x, y: center.y + first.shift.y };

  // A second wall across the first one makes a corner.
  const second = snapsFor(center).find(
    (snap) => snap.wallId !== first.wallId && Math.abs(snap.normal.x * first.normal.y - snap.normal.y * first.normal.x) > 0.5,
  );
  if (!second) return { ...center, wallIds: [first.wallId] };
  return { x: center.x + second.shift.x, y: center.y + second.shift.y, wallIds: [first.wallId, second.wallId] };
}

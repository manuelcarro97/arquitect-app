import { describe, expect, it } from 'vitest';
import { setWallFinish, setZoneWallsFinish, wallFacesInZone } from './finishes';
import { unwrap } from './result';
import { rectanglePerimeter } from './test-fixtures';
import type { Floor } from './types';

// 600×400 flat split by a partition at x = 300: left zone "Salón", right zone "Cocina".
const floor: Floor = {
  perimeter: rectanglePerimeter(600, 400),
  partitions: [{ id: 'p', a: { x: 300, y: 0 }, b: { x: 300, y: 400 }, thickness: 10, height: 250 }],
  openings: [],
  furniture: [],
  zones: [
    { id: 'salon', name: 'Salón', color: '#fff', points: [{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 300, y: 400 }, { x: 0, y: 400 }] },
    { id: 'cocina', name: 'Cocina', color: '#fff', points: [{ x: 300, y: 0 }, { x: 600, y: 0 }, { x: 600, y: 400 }, { x: 300, y: 400 }] },
  ],
};

describe('setWallFinish', () => {
  it('sets each face of a partition independently', () => {
    let result = unwrap(setWallFinish(floor, 'p', 'A', 'paint:#ffffff'));
    result = unwrap(setWallFinish(result, 'p', 'B', 'tile-white'));
    expect(result.partitions[0]).toMatchObject({ finishA: 'paint:#ffffff', finishB: 'tile-white' });
    expect(unwrap(setWallFinish(result, 'p', 'A', null)).partitions[0].finishA).toBeUndefined();
  });

  it('works on perimeter walls and rejects unknown walls', () => {
    const id = floor.perimeter.segments[0].id;
    expect(unwrap(setWallFinish(floor, id, 'A', 'x')).perimeter.segments[0].finishA).toBe('x');
    expect(setWallFinish(floor, 'nope', 'A', 'x')).toEqual({ ok: false, error: 'WALL_NOT_FOUND' });
  });
});

describe('wallFacesInZone', () => {
  it('finds the faces that look into a zone, including the partition side', () => {
    const faces = wallFacesInZone(floor, floor.zones[1]);
    // Cocina: top, right and bottom perimeter walls (inner faces) plus the partition face towards +x.
    expect(faces).toHaveLength(4);
    const partitionFace = faces.find((face) => face.wall.id === 'p');
    // The partition runs down (+y); its face A normal (-dir.y, dir.x) points to -x, so Cocina (+x) is face B.
    expect(partitionFace?.side).toBe('B');
  });

  it('paints all the walls of a zone at once', () => {
    const painted = unwrap(setZoneWallsFinish(floor, 'salon', 'paint:#eee'));
    expect(painted.partitions[0].finishA).toBe('paint:#eee');
    expect(painted.partitions[0].finishB).toBeUndefined();
    expect(painted.perimeter.segments.filter((s) => s.finishA === 'paint:#eee' || s.finishB === 'paint:#eee')).toHaveLength(3);
  });
});

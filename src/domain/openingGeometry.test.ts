import { describe, expect, it } from 'vitest';
import { centredOffset, openingFrame, wallAtPoint } from './openingGeometry';
import { rectanglePerimeter } from './test-fixtures';
import type { Floor, Opening, WallGeometry } from './types';

const wall: WallGeometry = {
  id: 'w',
  kind: 'partition',
  start: { x: 0, y: 0 },
  end: { x: 400, y: 0 },
  length: 400,
  thickness: 10,
  height: 250,
};

const door: Opening = { id: 'd', wallId: 'w', type: 'door', offset: 100, width: 80, height: 210, sillHeight: 0 };

describe('openingFrame', () => {
  it('places jambs along the wall and swings into face A by default', () => {
    const frame = openingFrame(wall, door);
    expect(frame.start).toEqual({ x: 100, y: 0 });
    expect(frame.end).toEqual({ x: 180, y: 0 });
    expect(frame.hinge).toEqual({ x: 100, y: 0 });
    // Face A of a wall pointing right (+x) is +y (down on screen).
    expect(frame.openLeafTip).toEqual({ x: 100, y: 80 });
  });

  it('flips hinge and swing side', () => {
    const frame = openingFrame(wall, { ...door, hinge: 'end', swingSide: 'B' });
    expect(frame.hinge).toEqual({ x: 180, y: 0 });
    expect(frame.latch).toEqual({ x: 100, y: 0 });
    expect(frame.openLeafTip.x).toBeCloseTo(180);
    expect(frame.openLeafTip.y).toBeCloseTo(-80);
  });
});

describe('wallAtPoint', () => {
  it('finds the nearest wall within reach and the distance along it', () => {
    const floor: Floor = {
      perimeter: rectanglePerimeter(400, 300),
      partitions: [],
      openings: [],
      furniture: [],
      zones: [],
    };
    const hit = wallAtPoint(floor, { x: 150, y: 8 }, 20);
    expect(hit?.wall.id).toBe(floor.perimeter.segments[0].id);
    expect(hit?.along).toBeCloseTo(150);
    expect(wallAtPoint(floor, { x: 200, y: 150 }, 20)).toBeNull();
  });
});

describe('centredOffset', () => {
  it('centres the opening on the pointer but keeps it inside the wall', () => {
    expect(centredOffset(400, 200, 80)).toBe(160);
    expect(centredOffset(400, 10, 80)).toBe(0);
    expect(centredOffset(400, 395, 80)).toBe(320);
    expect(centredOffset(60, 30, 80)).toBeNull();
  });
});

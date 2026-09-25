import { describe, expect, it } from 'vitest';
import { centredOffset, interiorSide, openingFrame, wallAtPoint, wallJunctions } from './openingGeometry';
import { getWalls } from './walls';
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

describe('interiorSide', () => {
  it('returns the face of a perimeter wall that looks into the flat', () => {
    const floor: Floor = {
      perimeter: rectanglePerimeter(400, 300),
      partitions: [],
      openings: [],
      furniture: [],
      zones: [],
    };
    const top = { ...wall, id: 'top', kind: 'perimeter' as const, thickness: 30 };
    // Clockwise on screen: face A (+y for the top wall) points inside.
    expect(interiorSide(floor, top)).toBe('A');
    const reversed = { ...top, start: { x: 400, y: 0 }, end: { x: 0, y: 0 } };
    expect(interiorSide(floor, reversed)).toBe('B');
  });
});

describe('wallJunctions', () => {
  const base: Floor = { perimeter: rectanglePerimeter(600, 400), partitions: [], openings: [], furniture: [], zones: [] };
  const props = { thickness: 10, height: 250 };

  it('finds partitions ending on a wall, with the face they stand on', () => {
    const floor: Floor = {
      ...base,
      partitions: [
        { id: 'inside', a: { x: 250, y: 0 }, b: { x: 250, y: 400 }, ...props },
        { id: 'other', a: { x: 100, y: 200 }, b: { x: 500, y: 200 }, ...props },
      ],
    };
    const top = getWalls(floor)[0];
    const junctions = wallJunctions(floor, top);
    expect(junctions).toEqual([{ wallId: 'inside', along: 250, width: 10, side: 'A' }]);
  });

  it('marks partitions crossing a partition as standing on both faces', () => {
    const floor: Floor = {
      ...base,
      partitions: [
        { id: 'h', a: { x: 0, y: 200 }, b: { x: 600, y: 200 }, ...props },
        { id: 'v', a: { x: 300, y: 100 }, b: { x: 300, y: 300 }, ...props },
      ],
    };
    const h = getWalls(floor).find((w) => w.id === 'h')!;
    expect(wallJunctions(floor, h)).toEqual([{ wallId: 'v', along: 300, width: 10, side: 'both' }]);
  });

  it('ignores the perimeter corners at the wall ends', () => {
    const top = getWalls(base)[0];
    expect(wallJunctions(base, top)).toEqual([]);
  });
});

describe('wallJunctions (angles)', () => {
  it('includes diagonal walls, with the width they take along the wall', () => {
    const floor: Floor = {
      perimeter: rectanglePerimeter(600, 400),
      partitions: [{ id: 'diagonal', a: { x: 250, y: 0 }, b: { x: 400, y: 300 }, thickness: 10, height: 250 }],
      openings: [],
      furniture: [],
      zones: [],
    };
    const [junction] = wallJunctions(floor, getWalls(floor)[0]);
    expect(junction).toMatchObject({ wallId: 'diagonal', along: 250, side: 'A' });
    // Arrives at ~63° (sine 300/335.4), so it spans 10 / 0.894 ≈ 11.2 cm along the wall.
    expect(junction.width).toBeCloseTo(11.18, 1);
  });
});

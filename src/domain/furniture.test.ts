import { describe, expect, it } from 'vitest';
import { furnitureCorners, furnitureOutsideIds, snapFurnitureToWalls } from './furniture';
import { rectanglePerimeter } from './test-fixtures';
import type { Floor, Furniture } from './types';
import { getWalls } from './walls';

const floor: Floor = { perimeter: rectanglePerimeter(600, 400), partitions: [], openings: [], furniture: [], zones: [] };
const walls = getWalls(floor);
const sofa = { width: 200, depth: 90, rotation: 0 };

describe('furnitureCorners', () => {
  it('uses width along the side and depth towards the front', () => {
    const corners = furnitureCorners({ x: 100, y: 100, width: 200, depth: 90, rotation: 90 });
    // Rotated 90°: width now runs down (y) and the front faces left (-x).
    expect(corners[0].x).toBeCloseTo(145);
    expect(corners[0].y).toBeCloseTo(0);
  });
});

describe('snapFurnitureToWalls', () => {
  it('pulls a piece flush against a nearby wall face', () => {
    // Top wall inner face is at y = 15 (30 cm thick); the sofa back (y - 45) is 10 cm away.
    const snapped = snapFurnitureToWalls({ ...sofa, x: 300, y: 70 }, walls, 15);
    expect(snapped.x).toBeCloseTo(300);
    expect(snapped.y).toBeCloseTo(60);
    expect(snapped.wallIds).toHaveLength(1);
  });

  it('fits into a corner against two walls', () => {
    const snapped = snapFurnitureToWalls({ ...sofa, x: 120, y: 68 }, walls, 15);
    expect(snapped.x).toBeCloseTo(115);
    expect(snapped.y).toBeCloseTo(60);
    expect(snapped.wallIds).toHaveLength(2);
  });

  it('leaves pieces far from walls or not square to them alone', () => {
    expect(snapFurnitureToWalls({ ...sofa, x: 300, y: 200 }, walls, 15)).toMatchObject({ x: 300, y: 200, wallIds: [] });
    expect(snapFurnitureToWalls({ ...sofa, rotation: 30, x: 300, y: 80 }, walls, 15).wallIds).toEqual([]);
  });
});

describe('furnitureOutsideIds', () => {
  it('flags pieces sticking out of the perimeter', () => {
    const pieces: Furniture[] = [
      { id: 'in', catalogId: 'x', x: 300, y: 200, width: 100, depth: 50, height: 80, rotation: 0 },
      { id: 'out', catalogId: 'x', x: 590, y: 200, width: 100, depth: 50, height: 80, rotation: 0 },
    ];
    expect(furnitureOutsideIds({ ...floor, furniture: pieces })).toEqual(['out']);
  });
});

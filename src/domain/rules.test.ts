import { describe, expect, it } from 'vitest';
import { addOpening, invalidOpeningIds, type OpeningInput } from './openings';
import { addPartition, invalidPartitionIds, movePartition, removePartition } from './partitions';
import { createPerimeter, moveSegment, updateSegment } from './perimeter';
import { createProject, duplicateVersion } from './project';
import { unwrap } from './result';
import { lShapePerimeter, rectanglePerimeter } from './test-fixtures';
import type { Floor, Perimeter } from './types';

function floorOf(perimeter: Perimeter): Floor {
  return { perimeter, partitions: [], openings: [], furniture: [], zones: [] };
}

function windowOn(floor: Floor, overrides: Partial<OpeningInput> = {}): OpeningInput {
  return {
    wallId: floor.perimeter.segments[0].id,
    type: 'window',
    offset: 100,
    width: 120,
    height: 100,
    sillHeight: 100,
    ...overrides,
  };
}

describe('partition rules', () => {
  it('requires a closed perimeter', () => {
    expect(addPartition(floorOf(createPerimeter()), { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({
      ok: false,
      error: 'PERIMETER_NOT_CLOSED',
    });
  });

  it('rejects partitions leaving the perimeter (neighbour protection)', () => {
    expect(addPartition(floorOf(lShapePerimeter()), { x: 100, y: 100 }, { x: 300, y: 300 })).toEqual({
      ok: false,
      error: 'PARTITION_OUTSIDE_PERIMETER',
    });
  });

  it('moves a partition but not outside', () => {
    const floor = unwrap(addPartition(floorOf(rectanglePerimeter(400, 300)), { x: 200, y: 0 }, { x: 200, y: 300 }));
    const id = floor.partitions[0].id;
    expect(unwrap(movePartition(floor, id, { x: 50, y: 0 })).partitions[0].a).toEqual({ x: 250, y: 0 });
    expect(movePartition(floor, id, { x: 500, y: 0 })).toEqual({ ok: false, error: 'PARTITION_OUTSIDE_PERIMETER' });
  });

  it('removes a partition together with its openings', () => {
    let floor = unwrap(addPartition(floorOf(rectanglePerimeter(400, 300)), { x: 200, y: 0 }, { x: 200, y: 300 }));
    const id = floor.partitions[0].id;
    floor = unwrap(addOpening(floor, { wallId: id, type: 'door', offset: 50, width: 82, height: 210, sillHeight: 0 }));
    const removed = unwrap(removePartition(floor, id));
    expect(removed.openings).toHaveLength(0);
  });

  it('flags partitions left outside after the perimeter shrinks', () => {
    const floor = unwrap(addPartition(floorOf(rectanglePerimeter(400, 300)), { x: 350, y: 0 }, { x: 350, y: 300 }));
    const shrunk = { ...floor, perimeter: unwrap(moveSegment(floor.perimeter, floor.perimeter.segments[1].id, 100)) };
    expect(invalidPartitionIds(shrunk)).toEqual([floor.partitions[0].id]);
  });
});

describe('opening rules', () => {
  it('rejects openings exceeding the wall and overlapping ones, allows touching ones', () => {
    const empty = floorOf(rectanglePerimeter(400, 300));
    expect(addOpening(empty, windowOn(empty, { offset: 350 }))).toEqual({ ok: false, error: 'OPENING_OUT_OF_WALL' });
    expect(addOpening(empty, windowOn(empty, { sillHeight: 200 }))).toEqual({ ok: false, error: 'OPENING_OUT_OF_WALL' });

    const floor = unwrap(addOpening(empty, windowOn(empty)));
    expect(addOpening(floor, windowOn(floor, { offset: 150 }))).toEqual({ ok: false, error: 'OPENING_OVERLAP' });
    expect(addOpening(floor, windowOn(floor, { offset: 220, width: 80 })).ok).toBe(true);
  });

  it('flags openings that no longer fit after the wall shrinks', () => {
    const empty = floorOf(rectanglePerimeter(400, 300));
    const floor = unwrap(addOpening(empty, windowOn(empty, { offset: 250 })));
    const shrunk = {
      ...floor,
      perimeter: unwrap(updateSegment(floor.perimeter, floor.perimeter.segments[0].id, { length: 300 })),
    };
    expect(invalidOpeningIds(shrunk)).toEqual([floor.openings[0].id]);
  });
});

describe('versions', () => {
  it('duplicates a version as an independent deep copy', () => {
    const project = unwrap(createProject('Casa'));
    project.versions[0].floor.perimeter = rectanglePerimeter(400, 300);
    const duplicated = unwrap(duplicateVersion(project, project.versions[0].id, '2 baños'));
    duplicated.versions[1].floor.perimeter.segments[0].length = 999;
    expect(duplicated.versions[0].floor.perimeter.segments[0].length).toBe(400);
  });
});

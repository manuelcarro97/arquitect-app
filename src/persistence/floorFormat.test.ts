import { describe, expect, it } from 'vitest';
import { createEmptyFloor } from '../domain';
import { FORMAT_VERSION, readFloor } from './floorFormat';

function floorWithPartition(partition: object) {
  return { ...createEmptyFloor(), partitions: [partition] };
}

const partition = { id: 'p1', a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, thickness: 10, height: 250 };

describe('readFloor', () => {
  it('accepts a valid floor and drops fields the app does not know', () => {
    const result = readFloor({ ...floorWithPartition(partition), leftover: true }, FORMAT_VERSION);
    expect(result).toEqual({ ok: true, floor: floorWithPartition(partition) });
  });

  it('upgrades floors saved with an older format', () => {
    expect(readFloor(createEmptyFloor(), 1)).toEqual({ ok: true, floor: createEmptyFloor() });
  });

  it('rejects files from a newer version of the app', () => {
    expect(readFloor(createEmptyFloor(), FORMAT_VERSION + 1)).toEqual({
      ok: false,
      message: 'se guardó con una versión más nueva de la aplicación',
    });
  });

  it('says which element is damaged', () => {
    const broken = floorWithPartition({ ...partition, thickness: null });
    expect(readFloor(broken, FORMAT_VERSION)).toEqual({ ok: false, message: 'dato no válido en tabique 1 › thickness' });
  });

  it('rejects impossible sizes', () => {
    expect(readFloor(floorWithPartition({ ...partition, height: -5 }), FORMAT_VERSION).ok).toBe(false);
  });
});

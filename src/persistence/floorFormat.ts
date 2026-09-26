import { z } from 'zod';
import type { Floor } from '../domain';

/**
 * Version of the saved data format. Increase it whenever the shape of `Floor` changes in a way
 * old files do not already match, and add the matching step to `FLOOR_UPGRADES`.
 */
export const FORMAT_VERSION = 2;

type FloorData = Record<string, unknown>;

/**
 * Upgrade steps: the entry for N turns a floor saved with format N into format N + 1.
 * Old files are upgraded step by step (1 → 2 → 3…) when they are opened, so every saved project keeps opening.
 */
const FLOOR_UPGRADES: Record<number, (floor: FloorData) => FloorData> = {
  // Format 1 (single-file projects) and format 2 (one file per version) store floors with the same shape.
  1: (floor) => floor,
};

const size = z.number().positive();
const point = z.object({ x: z.number(), y: z.number() });
const materialId = z.string().optional();
const wallProps = { thickness: size, height: size, finishA: materialId, finishB: materialId };
const wallSide = z.enum(['A', 'B']);

/** Checks every field and drops unknown ones, so a damaged file fails here instead of breaking the views. */
const floorSchema = z.object({
  perimeter: z.object({
    start: point,
    segments: z.array(
      z.object({
        id: z.string(),
        length: size,
        angle: z.number(),
        arc: z.object({ bulge: z.number() }).optional(),
        ...wallProps,
      }),
    ),
  }),
  partitions: z.array(z.object({ id: z.string(), a: point, b: point, ...wallProps })),
  openings: z.array(
    z.object({
      id: z.string(),
      wallId: z.string(),
      type: z.enum(['door', 'window']),
      offset: z.number().nonnegative(),
      width: size,
      height: size,
      sillHeight: z.number().nonnegative(),
      hinge: z.enum(['start', 'end']).optional(),
      swingSide: wallSide.optional(),
    }),
  ),
  furniture: z.array(
    z.object({
      id: z.string(),
      catalogId: z.string(),
      name: z.string().optional(),
      color: z.string().optional(),
      x: z.number(),
      y: z.number(),
      rotation: z.number(),
      width: size,
      depth: size,
      height: size,
    }),
  ),
  zones: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      color: z.string(),
      points: z.array(point),
      floorFinish: materialId,
    }),
  ),
  floorFinish: materialId,
}) satisfies z.ZodType<Floor>;

/** Spanish names for the parts of a floor, to say where a damaged file is broken. */
const PART_NAMES: Record<string, string> = {
  perimeter: 'perímetro',
  segments: 'tramo',
  partitions: 'tabique',
  openings: 'hueco',
  furniture: 'mueble',
  zones: 'zona',
  points: 'vértice',
};

function describePath(path: PropertyKey[]): string {
  const parts: string[] = [];
  for (const key of path) {
    if (typeof key === 'number') parts[parts.length - 1] = `${parts[parts.length - 1]} ${key + 1}`;
    else parts.push(PART_NAMES[String(key)] ?? String(key));
  }
  return parts.join(' › ');
}

export type FloorResult = { ok: true; floor: Floor } | { ok: false; message: string };

/**
 * Turns a floor read from a file (saved with `formatVersion`) into a valid current floor.
 * Rejects files from a newer app version, upgrades older ones and validates every field.
 */
export function readFloor(data: unknown, formatVersion: unknown): FloorResult {
  if (typeof formatVersion !== 'number' || !Number.isInteger(formatVersion) || formatVersion < 1) {
    return { ok: false, message: 'no indica con qué versión de la aplicación se guardó' };
  }
  if (formatVersion > FORMAT_VERSION) {
    return { ok: false, message: 'se guardó con una versión más nueva de la aplicación' };
  }
  if (typeof data !== 'object' || data === null) return { ok: false, message: 'no contiene un plano' };

  let upgraded = data as FloorData;
  for (let version = formatVersion; version < FORMAT_VERSION; version++) {
    const upgrade = FLOOR_UPGRADES[version];
    if (!upgrade) return { ok: false, message: `no se sabe convertir el formato ${version}` };
    upgraded = upgrade(upgraded);
  }

  const parsed = floorSchema.safeParse(upgraded);
  if (parsed.success) return { ok: true, floor: parsed.data };
  const issue = parsed.error.issues[0];
  return { ok: false, message: `dato no válido en ${describePath(issue.path) || 'el plano'}` };
}

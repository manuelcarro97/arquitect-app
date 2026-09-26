import type { Project, Version } from '../domain';
import { readFloor } from './floorFormat';

export type ProjectResult = { ok: true; project: Project } | { ok: false; message: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Validates a whole project (name, versions and every floor) read from any saved copy
 * (autosave, backup file), upgrading floors saved with an older `formatVersion`.
 */
export function readProject(data: unknown, formatVersion: unknown): ProjectResult {
  if (!isObject(data) || typeof data.id !== 'string' || typeof data.name !== 'string') {
    return { ok: false, message: 'El proyecto está incompleto o dañado.' };
  }
  if (!Array.isArray(data.versions) || data.versions.length === 0) {
    return { ok: false, message: 'El proyecto no tiene versiones.' };
  }

  const versions: Version[] = [];
  for (const version of data.versions) {
    if (!isObject(version) || typeof version.id !== 'string' || typeof version.name !== 'string') {
      return { ok: false, message: 'Una de las versiones está incompleta o dañada.' };
    }
    if (typeof version.createdAt !== 'string') {
      return { ok: false, message: `La versión «${version.name}» no tiene fecha de creación.` };
    }
    const floor = readFloor(version.floor, formatVersion);
    if (!floor.ok) return { ok: false, message: `La versión «${version.name}» ${floor.message}.` };
    versions.push({ id: version.id, name: version.name, createdAt: version.createdAt, floor: floor.floor });
  }
  return { ok: true, project: { id: data.id, name: data.name, versions } };
}

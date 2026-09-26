import type { Project } from '../domain';
import { FORMAT_VERSION } from './floorFormat';
import { readProject, type ProjectResult } from './projectFormat';

/** Manual copy of one whole project (all its versions) in a single file, e.g. to keep a backup. */
const BACKUP_FORMAT = 'arquitect-app-backup';
export const BACKUP_EXTENSION = '.reforma.json';

export function serializeBackup(project: Project): string {
  return JSON.stringify({ format: BACKUP_FORMAT, formatVersion: FORMAT_VERSION, project }, null, 2);
}

export function parseBackup(text: string): ProjectResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: 'El fichero no es un JSON válido.' };
  }
  if (typeof data !== 'object' || data === null || (data as { format?: unknown }).format !== BACKUP_FORMAT) {
    return { ok: false, message: 'El fichero no es una copia de un proyecto.' };
  }
  const { project, formatVersion } = data as { project?: unknown; formatVersion?: unknown };
  return readProject(project, formatVersion);
}

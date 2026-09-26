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

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
const MAX_NAME_LENGTH = 80;

/** File name for the backup of `project`, valid on Windows, macOS, Linux and phones. */
export function backupFileName(projectName: string): string {
  let safe = projectName
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\p{Cc}/gu, '')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  if (safe === '') safe = 'proyecto';
  if (WINDOWS_RESERVED.test(safe)) safe = `${safe}_`;
  return `${safe}${BACKUP_EXTENSION}`;
}

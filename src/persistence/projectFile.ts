import type { Project } from '../domain';

export const FILE_FORMAT = 'arquitect-app-project';
export const FILE_FORMAT_VERSION = 1;
export const FILE_EXTENSION = '.arquitect.json';

interface ProjectFile {
  format: typeof FILE_FORMAT;
  formatVersion: number;
  project: Project;
}

export type ParseResult = { ok: true; project: Project } | { ok: false; message: string };

export function serializeProject(project: Project): string {
  const file: ProjectFile = { format: FILE_FORMAT, formatVersion: FILE_FORMAT_VERSION, project };
  return JSON.stringify(file, null, 2);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Minimal structural check: enough to reject foreign or corrupted files with a clear message. */
function looksLikeProject(value: unknown): value is Project {
  if (!isObject(value) || typeof value.name !== 'string' || !Array.isArray(value.versions)) return false;
  if (value.versions.length === 0) return false;
  return value.versions.every(
    (version) =>
      isObject(version) &&
      typeof version.id === 'string' &&
      isObject(version.floor) &&
      isObject(version.floor.perimeter) &&
      Array.isArray(version.floor.perimeter.segments) &&
      Array.isArray(version.floor.partitions) &&
      Array.isArray(version.floor.openings) &&
      Array.isArray(version.floor.furniture) &&
      Array.isArray(version.floor.zones),
  );
}

export function parseProjectFile(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: 'El fichero no es un JSON válido.' };
  }
  if (!isObject(data) || data.format !== FILE_FORMAT) {
    return { ok: false, message: 'El fichero no es un proyecto de Arquitect App.' };
  }
  if (typeof data.formatVersion !== 'number' || data.formatVersion > FILE_FORMAT_VERSION) {
    return { ok: false, message: 'El proyecto se guardó con una versión más nueva de la aplicación.' };
  }
  if (!looksLikeProject(data.project)) {
    return { ok: false, message: 'El proyecto está incompleto o dañado.' };
  }
  return { ok: true, project: data.project };
}

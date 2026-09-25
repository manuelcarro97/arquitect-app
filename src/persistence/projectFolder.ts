import type { Floor, Id, Project, Version } from '../domain';

/**
 * On-disk layout of a project:
 *
 *   <Project name>/
 *   ├─ proyecto.json        manifest: project name and ordered list of versions → file
 *   ├─ Estado actual.json   one file per version (its floor)
 *   └─ 2 baños.json
 */
export const MANIFEST_FILE = 'proyecto.json';
const MANIFEST_FORMAT = 'arquitect-app-project';
const VERSION_FORMAT = 'arquitect-app-version';
export const FOLDER_FORMAT_VERSION = 2;

interface ManifestEntry {
  id: Id;
  name: string;
  createdAt: string;
  file: string;
}

interface Manifest {
  format: typeof MANIFEST_FORMAT;
  formatVersion: number;
  id: Id;
  name: string;
  versions: ManifestEntry[];
}

interface VersionFile {
  format: typeof VERSION_FORMAT;
  formatVersion: number;
  id: Id;
  floor: Floor;
}

export interface FolderFile {
  name: string;
  content: string;
}

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
const MAX_NAME_LENGTH = 80;

/** Turns any user-given name into a valid Windows/macOS/Linux file or folder name. */
export function safeFileName(name: string, fallback: string): string {
  let safe = name
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\p{Cc}/gu, '')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, MAX_NAME_LENGTH)
    .trim();
  if (safe === '') safe = fallback;
  if (WINDOWS_RESERVED.test(safe)) safe = `${safe}_`;
  return safe;
}

/** One unique `.json` file name per version (case-insensitive, never the manifest's name). */
export function versionFileNames(versions: Version[]): string[] {
  const taken = new Set([MANIFEST_FILE.toLowerCase()]);
  return versions.map((version) => {
    const base = safeFileName(version.name, 'version');
    let candidate = `${base}.json`;
    for (let n = 2; taken.has(candidate.toLowerCase()); n++) candidate = `${base} (${n}).json`;
    taken.add(candidate.toLowerCase());
    return candidate;
  });
}

export function buildProjectFolder(project: Project): { manifest: FolderFile; versions: FolderFile[] } {
  const fileNames = versionFileNames(project.versions);
  const manifest: Manifest = {
    format: MANIFEST_FORMAT,
    formatVersion: FOLDER_FORMAT_VERSION,
    id: project.id,
    name: project.name,
    versions: project.versions.map((version, i) => ({
      id: version.id,
      name: version.name,
      createdAt: version.createdAt,
      file: fileNames[i],
    })),
  };
  const versions = project.versions.map((version, i) => {
    const file: VersionFile = {
      format: VERSION_FORMAT,
      formatVersion: FOLDER_FORMAT_VERSION,
      id: version.id,
      floor: version.floor,
    };
    return { name: fileNames[i], content: JSON.stringify(file, null, 2) };
  });
  return { manifest: { name: MANIFEST_FILE, content: JSON.stringify(manifest, null, 2) }, versions };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export type ManifestResult = { ok: true; manifest: Manifest } | { ok: false; message: string };

export function parseManifest(text: string): ManifestResult {
  const data = parseJson(text);
  if (!isObject(data) || data.format !== MANIFEST_FORMAT) {
    return { ok: false, message: `${MANIFEST_FILE} no es un índice de proyecto válido.` };
  }
  if (typeof data.formatVersion !== 'number' || data.formatVersion > FOLDER_FORMAT_VERSION) {
    return { ok: false, message: 'El proyecto se guardó con una versión más nueva de la aplicación.' };
  }
  const versions = data.versions;
  const validEntries =
    Array.isArray(versions) &&
    versions.length > 0 &&
    versions.every(
      (entry) =>
        isObject(entry) &&
        typeof entry.id === 'string' &&
        typeof entry.name === 'string' &&
        typeof entry.file === 'string',
    );
  if (typeof data.id !== 'string' || typeof data.name !== 'string' || !validEntries) {
    return { ok: false, message: `${MANIFEST_FILE} está incompleto o dañado.` };
  }
  return { ok: true, manifest: data as unknown as Manifest };
}

function looksLikeFloor(value: unknown): value is Floor {
  return (
    isObject(value) &&
    isObject(value.perimeter) &&
    Array.isArray(value.perimeter.segments) &&
    Array.isArray(value.partitions) &&
    Array.isArray(value.openings) &&
    Array.isArray(value.furniture) &&
    Array.isArray(value.zones)
  );
}

export type ProjectResult = { ok: true; project: Project } | { ok: false; message: string };

/** Rebuilds a project from its manifest, reading each version file through `readFile`. */
export async function readProjectFolder(
  manifestText: string,
  readFile: (name: string) => Promise<string | null>,
): Promise<ProjectResult> {
  const parsed = parseManifest(manifestText);
  if (!parsed.ok) return parsed;
  const { manifest } = parsed;

  const versions: Version[] = [];
  for (const entry of manifest.versions) {
    const text = await readFile(entry.file);
    if (text === null) return { ok: false, message: `Falta el fichero de la versión «${entry.name}» (${entry.file}).` };
    const data = parseJson(text);
    if (!isObject(data) || data.format !== VERSION_FORMAT || !looksLikeFloor(data.floor)) {
      return { ok: false, message: `El fichero ${entry.file} está dañado.` };
    }
    versions.push({ id: entry.id, name: entry.name, createdAt: entry.createdAt, floor: data.floor });
  }
  return { ok: true, project: { id: manifest.id, name: manifest.name, versions } };
}

/**
 * Version files listed in the previous manifest that the new save no longer writes
 * (deleted or renamed versions). Only files the app itself created are ever returned.
 */
export function staleVersionFiles(previousManifestText: string | null, newFileNames: string[]): string[] {
  if (previousManifestText === null) return [];
  const previous = parseManifest(previousManifestText);
  if (!previous.ok) return [];
  const kept = new Set(newFileNames.map((name) => name.toLowerCase()));
  return previous.manifest.versions
    .map((entry) => entry.file)
    .filter((file) => !kept.has(file.toLowerCase()) && file.toLowerCase() !== MANIFEST_FILE);
}

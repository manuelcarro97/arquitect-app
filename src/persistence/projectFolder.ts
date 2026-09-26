import type { Id, Version } from '../domain';
import { FORMAT_VERSION, readFloor } from './floorFormat';
import type { ProjectResult } from './projectFormat';

/**
 * Project folders saved by earlier versions of the app (before cloud saving). They are only read, to import them:
 *
 *   <Project name>/
 *   ├─ proyecto.json        manifest: project name and ordered list of versions → file
 *   ├─ Estado actual.json   one file per version (its floor)
 *   └─ 2 baños.json
 */
export const MANIFEST_FILE = 'proyecto.json';
const MANIFEST_FORMAT = 'arquitect-app-project';
const VERSION_FORMAT = 'arquitect-app-version';

interface Manifest {
  id: Id;
  name: string;
  versions: { id: Id; name: string; createdAt: string; file: string }[];
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

type ManifestResult = { ok: true; manifest: Manifest } | { ok: false; message: string };

function parseManifest(text: string): ManifestResult {
  const data = parseJson(text);
  if (!isObject(data) || data.format !== MANIFEST_FORMAT) {
    return { ok: false, message: `${MANIFEST_FILE} no es un índice de proyecto válido.` };
  }
  if (typeof data.formatVersion !== 'number' || data.formatVersion > FORMAT_VERSION) {
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
        typeof entry.createdAt === 'string' &&
        typeof entry.file === 'string',
    );
  if (typeof data.id !== 'string' || typeof data.name !== 'string' || !validEntries) {
    return { ok: false, message: `${MANIFEST_FILE} está incompleto o dañado.` };
  }
  return { ok: true, manifest: data as unknown as Manifest };
}

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
    if (!isObject(data) || data.format !== VERSION_FORMAT) {
      return { ok: false, message: `El fichero ${entry.file} está dañado o no es una versión de un proyecto.` };
    }
    const floor = readFloor(data.floor, data.formatVersion);
    if (!floor.ok) return { ok: false, message: `La versión «${entry.name}» (${entry.file}) ${floor.message}.` };
    versions.push({ id: entry.id, name: entry.name, createdAt: entry.createdAt, floor: floor.floor });
  }
  return { ok: true, project: { id: manifest.id, name: manifest.name, versions } };
}

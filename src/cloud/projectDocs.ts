import type { Floor, Id, Project, Version } from '../domain';
import { FORMAT_VERSION, readFloor } from '../persistence/floorFormat';
import type { ProjectResult } from '../persistence/projectFormat';

/**
 * How a project is stored in Firestore, like the old folder layout:
 *
 *   users/{uid}/projects/{projectId}              ProjectIndexDoc (name and ordered versions)
 *   users/{uid}/projects/{projectId}/versions/{id} VersionDoc (the floor of one version)
 *
 * One document per version keeps each one far below Firestore's 1 MB limit
 * and lets a save rewrite only the versions that changed.
 */
export interface ProjectIndexDoc {
  formatVersion: number;
  name: string;
  versions: { id: Id; name: string; createdAt: string }[];
}

export interface VersionDoc {
  formatVersion: number;
  floor: Floor;
}

export interface ProjectWrites {
  index: ProjectIndexDoc;
  /** Versions to (re)write. */
  write: { id: Id; doc: VersionDoc }[];
  /** Versions saved before that no longer exist. */
  remove: Id[];
}

/**
 * Documents to write for `project`. With `previous` (the same project as last saved), versions whose
 * floor is the same object are skipped: the store never mutates a floor, it replaces it when edited.
 */
export function projectToDocs(project: Project, previous: Project | null): ProjectWrites {
  const before = previous?.id === project.id ? previous : null;
  const unchanged = (version: Version) => before?.versions.some((v) => v.id === version.id && v.floor === version.floor);
  const kept = new Set(project.versions.map((version) => version.id));

  return {
    index: {
      formatVersion: FORMAT_VERSION,
      name: project.name,
      versions: project.versions.map(({ id, name, createdAt }) => ({ id, name, createdAt })),
    },
    write: project.versions
      .filter((version) => !unchanged(version))
      .map((version) => ({ id: version.id, doc: { formatVersion: FORMAT_VERSION, floor: version.floor } })),
    remove: (before?.versions ?? []).filter((version) => !kept.has(version.id)).map((version) => version.id),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Rebuilds a project from its Firestore documents, validating (and upgrading) every floor. */
export function docsToProject(id: Id, index: unknown, versionDocs: Map<Id, unknown>): ProjectResult {
  if (!isObject(index) || typeof index.name !== 'string' || !Array.isArray(index.versions)) {
    return { ok: false, message: 'El proyecto guardado en la nube está dañado.' };
  }
  if (typeof index.formatVersion !== 'number' || index.formatVersion > FORMAT_VERSION) {
    return { ok: false, message: 'El proyecto se guardó con una versión más nueva de la aplicación. Recarga la página.' };
  }

  const versions: Version[] = [];
  for (const entry of index.versions) {
    if (!isObject(entry) || typeof entry.id !== 'string' || typeof entry.name !== 'string') {
      return { ok: false, message: 'La lista de versiones del proyecto está dañada.' };
    }
    const doc = versionDocs.get(entry.id);
    if (!isObject(doc)) return { ok: false, message: `Falta la versión «${entry.name}» en la nube.` };
    // Each version keeps the format it was written with: unchanged versions are not rewritten on save.
    const floor = readFloor(doc.floor, doc.formatVersion);
    if (!floor.ok) return { ok: false, message: `La versión «${entry.name}» ${floor.message}.` };
    const createdAt = typeof entry.createdAt === 'string' ? entry.createdAt : new Date(0).toISOString();
    versions.push({ id: entry.id, name: entry.name, createdAt, floor: floor.floor });
  }
  if (versions.length === 0) return { ok: false, message: 'El proyecto guardado en la nube no tiene versiones.' };
  return { ok: true, project: { id, name: index.name, versions } };
}

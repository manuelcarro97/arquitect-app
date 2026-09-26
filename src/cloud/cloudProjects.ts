import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import type { Id, Project } from '../domain';
import { db } from './firebase';
import { docsToProject, projectToDocs } from './projectDocs';

export interface CloudProjectSummary {
  id: Id;
  name: string;
  updatedAt: Date | null;
}

const projectsOf = (uid: string) => collection(db, 'users', uid, 'projects');
const projectRef = (uid: string, id: Id) => doc(db, 'users', uid, 'projects', id);
const versionsOf = (uid: string, id: Id) => collection(db, 'users', uid, 'projects', id, 'versions');

/**
 * Last cloud modification time this browser knows for each project (when it opened or saved it).
 * If the cloud copy is newer, another device saved in between: saving asks before overwriting.
 * Kept in localStorage so it survives page reloads.
 */
const KNOWN_UPDATES_KEY = 'arquitect-app:cloud-updates';

function knownUpdates(): Record<Id, number> {
  try {
    return JSON.parse(localStorage.getItem(KNOWN_UPDATES_KEY) ?? '{}') as Record<Id, number>;
  } catch {
    return {};
  }
}

function rememberUpdate(id: Id, millis: number | null): void {
  const updates = knownUpdates();
  if (millis === null) delete updates[id];
  else updates[id] = millis;
  try {
    localStorage.setItem(KNOWN_UPDATES_KEY, JSON.stringify(updates));
  } catch {
    // Without storage the next save just asks before overwriting.
  }
}

function toMillis(value: unknown): number | null {
  return value instanceof Timestamp ? value.toMillis() : null;
}

/** Turns Firestore errors into messages for the user. */
function friendlyError(error: unknown): Error {
  const code = (error as { code?: string }).code;
  if (code === 'permission-denied') return new Error('Tu cuenta no tiene permiso para guardar en la nube.');
  if (code === 'unavailable') return new Error('No hay conexión con la nube. Inténtalo de nuevo en un momento.');
  return error instanceof Error ? error : new Error(String(error));
}

async function withFriendlyErrors<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw friendlyError(error);
  }
}

/** The user's projects, most recently saved first. */
export function listCloudProjects(uid: string): Promise<CloudProjectSummary[]> {
  return withFriendlyErrors(async () => {
    const snapshot = await getDocs(query(projectsOf(uid), orderBy('updatedAt', 'desc')));
    return snapshot.docs.map((project) => {
      const millis = toMillis(project.get('updatedAt'));
      return { id: project.id, name: String(project.get('name') ?? 'Sin nombre'), updatedAt: millis === null ? null : new Date(millis) };
    });
  });
}

export function loadCloudProject(uid: string, id: Id): Promise<Project> {
  return withFriendlyErrors(async () => {
    const [index, versions] = await Promise.all([getDoc(projectRef(uid, id)), getDocs(versionsOf(uid, id))]);
    if (!index.exists()) throw new Error('Ese proyecto ya no existe en la nube.');
    const result = docsToProject(id, index.data(), new Map(versions.docs.map((version) => [version.id, version.data()])));
    if (!result.ok) throw new Error(result.message);
    rememberUpdate(id, toMillis(index.get('updatedAt')));
    return result.project;
  });
}

/**
 * Saves the project in one atomic batch: its index, the versions that changed since `previous`
 * (the last saved state) and the removal of deleted versions.
 * Returns "conflict" without writing when another device saved it after this browser last did,
 * unless `force` is set.
 */
export function saveCloudProject(
  uid: string,
  project: Project,
  previous: Project | null,
  { force }: { force: boolean },
): Promise<'saved' | 'conflict'> {
  return withFriendlyErrors(async () => {
    const ref = projectRef(uid, project.id);
    const remote = await getDoc(ref);
    const remoteUpdate = remote.exists() ? toMillis(remote.get('updatedAt')) : null;
    const known = knownUpdates()[project.id];
    const upToDate = remote.exists() && known !== undefined && remoteUpdate === known;
    if (remote.exists() && !upToDate && !force) return 'conflict';

    // `previous` only describes the cloud copy when nobody else wrote it: otherwise rewrite every version.
    const docs = projectToDocs(project, upToDate ? previous : null);
    const remoteVersions: { id?: unknown }[] = remote.exists() ? (remote.get('versions') ?? []) : [];
    const current = new Set(project.versions.map((version) => version.id));
    const stale = remoteVersions.map((version) => String(version.id)).filter((versionId) => !current.has(versionId));

    const batch = writeBatch(db);
    batch.set(ref, { ...docs.index, updatedAt: serverTimestamp() });
    for (const { id, doc: versionDoc } of docs.write) batch.set(doc(versionsOf(uid, project.id), id), versionDoc);
    for (const id of new Set([...docs.remove, ...stale])) batch.delete(doc(versionsOf(uid, project.id), id));
    await batch.commit();

    const saved = await getDoc(ref);
    rememberUpdate(project.id, toMillis(saved.get('updatedAt')));
    return 'saved';
  });
}

export function deleteCloudProject(uid: string, id: Id): Promise<void> {
  return withFriendlyErrors(async () => {
    const versions = await getDocs(versionsOf(uid, id));
    const batch = writeBatch(db);
    for (const version of versions.docs) batch.delete(version.ref);
    batch.delete(projectRef(uid, id));
    await batch.commit();
    rememberUpdate(id, null);
  });
}

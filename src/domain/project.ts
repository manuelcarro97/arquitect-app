import { createId } from './ids';
import { createPerimeter } from './perimeter';
import { err, ok, type Result } from './result';
import type { Floor, Id, Project, Version } from './types';

export const INITIAL_VERSION_NAME = 'Estado actual';

export function createEmptyFloor(): Floor {
  return { perimeter: createPerimeter(), partitions: [], openings: [], furniture: [], zones: [] };
}

function isBlank(name: string): boolean {
  return name.trim() === '';
}

export function createProject(name: string, now: Date = new Date()): Result<Project> {
  if (isBlank(name)) return err('INVALID_NAME');
  return ok({
    id: createId(),
    name: name.trim(),
    versions: [{ id: createId(), name: INITIAL_VERSION_NAME, createdAt: now.toISOString(), floor: createEmptyFloor() }],
  });
}

export function findVersion(project: Project, versionId: Id): Version | undefined {
  return project.versions.find((version) => version.id === versionId);
}

/** Deep-copies a version so both can be edited independently. The copy is appended. */
export function duplicateVersion(
  project: Project,
  versionId: Id,
  newName: string,
  now: Date = new Date(),
): Result<Project> {
  const source = findVersion(project, versionId);
  if (!source) return err('VERSION_NOT_FOUND');
  if (isBlank(newName)) return err('INVALID_NAME');
  const copy: Version = {
    id: createId(),
    name: newName.trim(),
    createdAt: now.toISOString(),
    floor: structuredClone(source.floor),
  };
  return ok({ ...project, versions: [...project.versions, copy] });
}

/** Appends a new version with an empty floor. */
export function addEmptyVersion(project: Project, name: string, now: Date = new Date()): Result<Project> {
  if (isBlank(name)) return err('INVALID_NAME');
  const version: Version = { id: createId(), name: name.trim(), createdAt: now.toISOString(), floor: createEmptyFloor() };
  return ok({ ...project, versions: [...project.versions, version] });
}

export function renameVersion(project: Project, versionId: Id, name: string): Result<Project> {
  if (!findVersion(project, versionId)) return err('VERSION_NOT_FOUND');
  if (isBlank(name)) return err('INVALID_NAME');
  return ok({
    ...project,
    versions: project.versions.map((version) =>
      version.id === versionId ? { ...version, name: name.trim() } : version,
    ),
  });
}

export function removeVersion(project: Project, versionId: Id): Result<Project> {
  if (!findVersion(project, versionId)) return err('VERSION_NOT_FOUND');
  if (project.versions.length === 1) return err('LAST_VERSION');
  return ok({ ...project, versions: project.versions.filter((version) => version.id !== versionId) });
}

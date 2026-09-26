import { describe, expect, it } from 'vitest';
import { createProject, duplicateVersion, removeVersion, unwrap, type Project } from '../domain';
import { FORMAT_VERSION } from '../persistence/floorFormat';
import { docsToProject, projectToDocs } from './projectDocs';

function twoVersions(): Project {
  const project = unwrap(createProject('Casa'));
  return unwrap(duplicateVersion(project, project.versions[0].id, '2 baños'));
}

function withRenamedFloorOf(project: Project, index: number): Project {
  const versions = project.versions.map((version, i) =>
    i === index ? { ...version, floor: { ...version.floor, floorFinish: 'wood' } } : version,
  );
  return { ...project, versions };
}

describe('projectToDocs', () => {
  it('writes every version when there is no previous save', () => {
    const project = twoVersions();
    const docs = projectToDocs(project, null);
    expect(docs.index).toEqual({
      formatVersion: FORMAT_VERSION,
      name: 'Casa',
      versions: project.versions.map(({ id, name, createdAt }) => ({ id, name, createdAt })),
    });
    expect(docs.write.map((entry) => entry.id)).toEqual(project.versions.map((version) => version.id));
    expect(docs.remove).toEqual([]);
  });

  it('writes only the versions that changed since the previous save', () => {
    const saved = twoVersions();
    const edited = withRenamedFloorOf(saved, 1);
    expect(projectToDocs(edited, saved).write.map((entry) => entry.id)).toEqual([saved.versions[1].id]);
  });

  it('removes versions deleted since the previous save', () => {
    const saved = twoVersions();
    const edited = unwrap(removeVersion(saved, saved.versions[1].id));
    expect(projectToDocs(edited, saved).remove).toEqual([saved.versions[1].id]);
  });

  it('writes everything when the previous save was another project', () => {
    const other = twoVersions();
    const project = twoVersions();
    expect(projectToDocs(project, other).write).toHaveLength(2);
  });
});

describe('docsToProject', () => {
  it('rebuilds the same project', () => {
    const project = twoVersions();
    const docs = projectToDocs(project, null);
    const versions = new Map(docs.write.map((entry) => [entry.id, entry.doc as unknown]));
    expect(docsToProject(project.id, docs.index, versions)).toEqual({ ok: true, project });
  });

  it('names a version that is missing', () => {
    const project = twoVersions();
    const docs = projectToDocs(project, null);
    const versions = new Map([[docs.write[0].id, docs.write[0].doc as unknown]]);
    expect(docsToProject(project.id, docs.index, versions)).toEqual({
      ok: false,
      message: 'Falta la versión «2 baños» en la nube.',
    });
  });
});

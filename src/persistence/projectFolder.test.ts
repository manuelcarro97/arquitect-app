import { describe, expect, it } from 'vitest';
import { createProject, duplicateVersion, unwrap, type Project } from '../domain';
import { MANIFEST_FILE, readProjectFolder } from './projectFolder';

function projectWithVersions(...names: string[]): Project {
  let project = unwrap(createProject('Casa Calle X'));
  for (const name of names) project = unwrap(duplicateVersion(project, project.versions[0].id, name));
  return project;
}

/** The files an earlier version of the app wrote for `project` (format 2). */
function oldFolderFiles(project: Project): { manifest: string; files: Map<string, string> } {
  const entries = project.versions.map((version, i) => ({ ...version, file: `v${i}.json` }));
  const manifest = JSON.stringify({
    format: 'arquitect-app-project',
    formatVersion: 2,
    id: project.id,
    name: project.name,
    versions: entries.map(({ id, name, createdAt, file }) => ({ id, name, createdAt, file })),
  });
  const files = new Map(
    entries.map((entry) => [
      entry.file,
      JSON.stringify({ format: 'arquitect-app-version', formatVersion: 2, id: entry.id, floor: entry.floor }),
    ]),
  );
  return { manifest, files };
}

describe('importing old project folders', () => {
  it('rebuilds the same project from the folder files', async () => {
    const project = projectWithVersions('2 baños');
    const { manifest, files } = oldFolderFiles(project);
    const result = await readProjectFolder(manifest, async (name) => files.get(name) ?? null);
    expect(result).toEqual({ ok: true, project });
  });

  it('reports a missing version file by name', async () => {
    const { manifest } = oldFolderFiles(projectWithVersions());
    const result = await readProjectFolder(manifest, async () => null);
    expect(result).toEqual({ ok: false, message: 'Falta el fichero de la versión «Estado actual» (v0.json).' });
  });

  it('rejects folders whose manifest is not ours', async () => {
    const result = await readProjectFolder('{"hello": 1}', async () => null);
    expect(result).toEqual({ ok: false, message: `${MANIFEST_FILE} no es un índice de proyecto válido.` });
  });
});

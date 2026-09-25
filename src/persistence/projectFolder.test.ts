import { describe, expect, it } from 'vitest';
import { createProject, duplicateVersion, unwrap, type Project } from '../domain';
import {
  buildProjectFolder,
  MANIFEST_FILE,
  readProjectFolder,
  safeFileName,
  staleVersionFiles,
  versionFileNames,
} from './projectFolder';

function projectWithVersions(...names: string[]): Project {
  let project = unwrap(createProject('Casa Calle X'));
  for (const name of names) project = unwrap(duplicateVersion(project, project.versions[0].id, name));
  return project;
}

describe('file names', () => {
  it('removes characters Windows does not allow and reserved names', () => {
    expect(safeFileName('Baño 1/2: "nuevo"?', 'x')).toBe('Baño 12 nuevo');
    expect(safeFileName('  ...  ', 'version')).toBe('version');
    expect(safeFileName('con', 'x')).toBe('con_');
    expect(safeFileName('reforma.', 'x')).toBe('reforma');
  });

  it('gives each version a unique file and never clashes with the manifest', () => {
    const project = projectWithVersions('2 baños', '2 BAÑOS', 'proyecto');
    expect(versionFileNames(project.versions)).toEqual([
      'Estado actual.json',
      '2 baños.json',
      '2 BAÑOS (2).json',
      'proyecto (2).json',
    ]);
  });
});

describe('save and open round trip', () => {
  it('rebuilds the same project from the folder files', async () => {
    const project = projectWithVersions('2 baños');
    const folder = buildProjectFolder(project);
    const files = new Map(folder.versions.map((file) => [file.name, file.content]));
    const result = await readProjectFolder(folder.manifest.content, async (name) => files.get(name) ?? null);
    expect(result).toEqual({ ok: true, project });
    expect(folder.manifest.name).toBe(MANIFEST_FILE);
  });

  it('reports a missing version file by name', async () => {
    const folder = buildProjectFolder(projectWithVersions('2 baños'));
    const result = await readProjectFolder(folder.manifest.content, async () => null);
    expect(result).toEqual({ ok: false, message: 'Falta el fichero de la versión «Estado actual» (Estado actual.json).' });
  });

  it('rejects folders whose manifest is not ours', async () => {
    const result = await readProjectFolder('{"hello": 1}', async () => null);
    expect(result.ok).toBe(false);
  });
});

describe('staleVersionFiles', () => {
  it('lists only files from the previous manifest that are no longer written', () => {
    const before = buildProjectFolder(projectWithVersions('2 baños', 'Cocina abierta'));
    const stale = staleVersionFiles(before.manifest.content, ['Estado actual.json', 'Cocina abierta v2.json']);
    expect(stale).toEqual(['2 baños.json', 'Cocina abierta.json']);
  });

  it('never deletes anything without a previous manifest', () => {
    expect(staleVersionFiles(null, [])).toEqual([]);
    expect(staleVersionFiles('not json', [])).toEqual([]);
  });
});

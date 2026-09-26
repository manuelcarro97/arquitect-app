import { describe, expect, it } from 'vitest';
import { createProject, duplicateVersion, unwrap } from '../domain';
import { backupFileName, parseBackup, serializeBackup } from './backupFile';

function sampleProject() {
  const project = unwrap(createProject('Casa'));
  return unwrap(duplicateVersion(project, project.versions[0].id, '2 baños'));
}

describe('backup file', () => {
  it('reads back the same project with all its versions', () => {
    const project = sampleProject();
    expect(parseBackup(serializeBackup(project))).toEqual({ ok: true, project });
  });

  it('rejects files that are not JSON or not a backup', () => {
    expect(parseBackup('hola')).toEqual({ ok: false, message: 'El fichero no es un JSON válido.' });
    expect(parseBackup('{"format": "otra-cosa"}')).toEqual({
      ok: false,
      message: 'El fichero no es una copia de un proyecto.',
    });
  });

  it('names the damaged version', () => {
    const text = serializeBackup(sampleProject());
    const data = JSON.parse(text);
    data.project.versions[1].floor.partitions = null;
    expect(parseBackup(JSON.stringify(data))).toEqual({
      ok: false,
      message: 'La versión «2 baños» dato no válido en tabique.',
    });
  });
});

describe('backupFileName', () => {
  it('removes characters Windows does not allow and reserved names', () => {
    expect(backupFileName('Baño 1/2: "nuevo"?\\')).toBe('Baño 12 nuevo.reforma.json');
    expect(backupFileName('  ...  ')).toBe('proyecto.reforma.json');
    expect(backupFileName('con')).toBe('con_.reforma.json');
  });
});

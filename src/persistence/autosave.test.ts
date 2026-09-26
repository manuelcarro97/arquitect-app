import { describe, expect, it } from 'vitest';
import { createProject, unwrap } from '../domain';
import { parseAutosave, serializeAutosave } from './autosave';

describe('autosave', () => {
  it('restores the project and whether it had unsaved changes', () => {
    const project = unwrap(createProject('Casa'));
    expect(parseAutosave(serializeAutosave({ project, saved: true }))).toEqual({ project, saved: true });
    expect(parseAutosave(serializeAutosave({ project, saved: false }))?.saved).toBe(false);
  });

  it('still reads autosaves written by the previous version, as unsaved', () => {
    const project = unwrap(createProject('Casa'));
    const legacy = JSON.stringify({ format: 'arquitect-app-project', formatVersion: 1, project });
    expect(parseAutosave(legacy)).toEqual({ project, saved: false });
  });

  it('ignores anything it cannot trust', () => {
    expect(parseAutosave('not json')).toBeNull();
    expect(parseAutosave('{"format": "other"}')).toBeNull();
    const project = unwrap(createProject('Casa'));
    const damaged = serializeAutosave({ project, saved: true }).replace('"segments":[]', '"segments":null');
    expect(parseAutosave(damaged)).toBeNull();
  });
});

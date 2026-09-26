import type { Project, Version } from '../domain';
import { useProjectStore } from '../store/projectStore';
import { FORMAT_VERSION, readFloor } from './floorFormat';

const STORAGE_KEY = 'arquitect-app:autosave';
const DEBOUNCE_MS = 500;
const AUTOSAVE_FORMAT = 'arquitect-app-autosave';
/** Autosaves written before the "saved" flag existed: a whole project in one file, format 1. */
const LEGACY_FORMAT = 'arquitect-app-project';

export interface Autosave {
  project: Project;
  /** Whether the project had no unsaved changes, so a reload does not show "sin guardar" by mistake. */
  saved: boolean;
}

export function serializeAutosave({ project, saved }: Autosave): string {
  return JSON.stringify({ format: AUTOSAVE_FORMAT, formatVersion: FORMAT_VERSION, saved, project });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readVersion(value: unknown, formatVersion: unknown): Version | null {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return null;
  if (typeof value.createdAt !== 'string') return null;
  const floor = readFloor(value.floor, formatVersion);
  return floor.ok ? { id: value.id, name: value.name, createdAt: value.createdAt, floor: floor.floor } : null;
}

/** The autosaved project, or null if there is none or it cannot be trusted (then the app starts empty). */
export function parseAutosave(text: string): Autosave | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(data) || (data.format !== AUTOSAVE_FORMAT && data.format !== LEGACY_FORMAT)) return null;
  const project = data.project;
  if (!isObject(project) || typeof project.id !== 'string' || typeof project.name !== 'string') return null;
  if (!Array.isArray(project.versions) || project.versions.length === 0) return null;

  const versions = project.versions.map((version) => readVersion(version, data.formatVersion));
  if (versions.some((version) => version === null)) return null;
  return {
    project: { id: project.id, name: project.name, versions: versions as Version[] },
    saved: data.saved === true,
  };
}

/** Last project edited in this browser, so a page reload does not lose work. */
export function loadAutosave(): Autosave | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? parseAutosave(text) : null;
  } catch {
    return null;
  }
}

/** Writes the project to localStorage shortly after every change, and when it is saved to disk. */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return useProjectStore.subscribe((state, previous) => {
    if (state.project === previous.project && state.savedProject === previous.savedProject) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const { project, savedProject } = useProjectStore.getState();
      try {
        localStorage.setItem(STORAGE_KEY, serializeAutosave({ project, saved: project === savedProject }));
      } catch {
        // Storage full or blocked: autosave is a convenience, the folder on disk is the real save.
      }
    }, DEBOUNCE_MS);
  });
}

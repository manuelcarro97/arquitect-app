import type { Project } from '../domain';
import { useProjectStore } from '../store/projectStore';
import { parseProjectFile, serializeProject } from './projectFile';

const STORAGE_KEY = 'arquitect-app:autosave';
const DEBOUNCE_MS = 500;

/** Last project edited in this browser, so a page reload does not lose work. */
export function loadAutosavedProject(): Project | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (!text) return null;
    const parsed = parseProjectFile(text);
    return parsed.ok ? parsed.project : null;
  } catch {
    return null;
  }
}

export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return useProjectStore.subscribe((state, previous) => {
    if (state.project === previous.project) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, serializeProject(state.project));
      } catch {
        // Storage full or blocked: autosave is a convenience, the file on disk is the real save.
      }
    }, DEBOUNCE_MS);
  });
}

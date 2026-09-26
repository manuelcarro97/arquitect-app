import type { Project } from '../domain';
import { MANIFEST_FILE, readProjectFolder } from './projectFolder';

// File System Access API (Chrome/Edge on computers). Declared locally because it is not in the standard DOM typings.
interface DirectoryPickerWindow {
  showDirectoryPicker?: (options: { id?: string; mode: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
}

const pickerWindow = window as unknown as DirectoryPickerWindow;

/** Project folders from before cloud saving can only be imported where the browser can open folders. */
export function canImportFolders(): boolean {
  return typeof pickerWindow.showDirectoryPicker === 'function';
}

async function readTextFile(folder: FileSystemDirectoryHandle, name: string): Promise<string | null> {
  try {
    const handle = await folder.getFileHandle(name);
    return await (await handle.getFile()).text();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return null;
    throw error;
  }
}

/**
 * Asks for a project folder saved by earlier versions of the app and reads it (read-only).
 * Returns null if cancelled; throws with a user-facing message if the folder is not a valid project.
 */
export async function importProjectFolder(): Promise<Project | null> {
  if (!pickerWindow.showDirectoryPicker) throw new Error('Este navegador no permite abrir carpetas. Usa Chrome o Edge en el ordenador.');
  let folder: FileSystemDirectoryHandle;
  try {
    folder = await pickerWindow.showDirectoryPicker({ id: 'arquitect-projects', mode: 'read' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
  const manifestText = await readTextFile(folder, MANIFEST_FILE);
  if (manifestText === null) {
    throw new Error(`«${folder.name}» no es la carpeta de un proyecto (no contiene ${MANIFEST_FILE}).`);
  }
  const result = await readProjectFolder(manifestText, (name) => readTextFile(folder, name));
  if (!result.ok) throw new Error(result.message);
  return result.project;
}

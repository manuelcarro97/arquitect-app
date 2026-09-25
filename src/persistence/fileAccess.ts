import type { Project } from '../domain';
import {
  buildProjectFolder,
  MANIFEST_FILE,
  parseManifest,
  readProjectFolder,
  safeFileName,
  staleVersionFiles,
} from './projectFolder';

// File System Access API (Chrome/Edge). The picker is declared locally because it is not in the standard DOM typings.
interface DirectoryPickerWindow {
  showDirectoryPicker?: (options: { id?: string; mode: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
}

const pickerWindow = window as unknown as DirectoryPickerWindow;
const PICKER_ID = 'arquitect-projects';
const UNSUPPORTED_MESSAGE = 'Este navegador no permite guardar carpetas. Usa Chrome o Edge.';

/** Folder of the project last opened or saved, so "Guardar" writes there without asking again. */
let currentFolder: FileSystemDirectoryHandle | null = null;

export function forgetCurrentFolder(): void {
  currentFolder = null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotFoundError';
}

async function readTextFile(folder: FileSystemDirectoryHandle, name: string): Promise<string | null> {
  try {
    const handle = await folder.getFileHandle(name);
    return await (await handle.getFile()).text();
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

async function writeTextFile(folder: FileSystemDirectoryHandle, name: string, content: string): Promise<void> {
  const handle = await folder.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

async function isEmptyFolder(folder: FileSystemDirectoryHandle): Promise<boolean> {
  for await (const entry of folder.values()) {
    void entry;
    return false;
  }
  return true;
}

/**
 * Creates (or reuses) `<parent>/<project name>/`. Refuses to write into a folder that holds
 * a different project or unrelated files, so nothing of the user's is ever overwritten.
 */
async function resolveProjectFolder(parent: FileSystemDirectoryHandle, project: Project) {
  const folder = await parent.getDirectoryHandle(safeFileName(project.name, 'proyecto'), { create: true });
  const manifestText = await readTextFile(folder, MANIFEST_FILE);
  if (manifestText !== null) {
    const existing = parseManifest(manifestText);
    if (!existing.ok || existing.manifest.id !== project.id) {
      throw new Error(`Ya hay otro proyecto en la carpeta «${folder.name}». Cambia el nombre del proyecto o elige otra carpeta.`);
    }
  } else if (!(await isEmptyFolder(folder))) {
    throw new Error(`La carpeta «${folder.name}» ya existe y contiene otros ficheros. Elige otra ubicación.`);
  }
  return folder;
}

/**
 * Saves the project as a folder (manifest + one file per version). The first time, or with `saveAs`,
 * asks where to create the project folder. Returns false if the user cancelled.
 */
export async function saveProjectFolder(project: Project, { saveAs }: { saveAs: boolean }): Promise<boolean> {
  if (!pickerWindow.showDirectoryPicker) throw new Error(UNSUPPORTED_MESSAGE);
  try {
    if (saveAs || !currentFolder) {
      const parent = await pickerWindow.showDirectoryPicker({ id: PICKER_ID, mode: 'readwrite' });
      currentFolder = await resolveProjectFolder(parent, project);
    }
    const folder = currentFolder;
    const previousManifest = await readTextFile(folder, MANIFEST_FILE);
    const { manifest, versions } = buildProjectFolder(project);

    // Versions first, manifest last: if something fails midway the old manifest still points to valid files.
    for (const file of versions) await writeTextFile(folder, file.name, file.content);
    await writeTextFile(folder, manifest.name, manifest.content);

    // Only files listed in our own previous manifest are removed (deleted or renamed versions).
    const stale = staleVersionFiles(
      previousManifest,
      versions.map((file) => file.name),
    );
    for (const name of stale) {
      try {
        await folder.removeEntry(name);
      } catch (error) {
        if (!isNotFoundError(error)) throw error;
      }
    }
    return true;
  } catch (error) {
    if (isAbortError(error)) return false;
    throw error;
  }
}

/** Asks for a project folder and reads it. Returns null if cancelled; throws with a user-facing message if invalid. */
export async function openProjectFolder(): Promise<Project | null> {
  if (!pickerWindow.showDirectoryPicker) throw new Error(UNSUPPORTED_MESSAGE);
  let folder: FileSystemDirectoryHandle;
  try {
    folder = await pickerWindow.showDirectoryPicker({ id: PICKER_ID, mode: 'readwrite' });
  } catch (error) {
    if (isAbortError(error)) return null;
    throw error;
  }
  const manifestText = await readTextFile(folder, MANIFEST_FILE);
  if (manifestText === null) {
    throw new Error(`«${folder.name}» no es la carpeta de un proyecto (no contiene ${MANIFEST_FILE}).`);
  }
  const result = await readProjectFolder(manifestText, (name) => readTextFile(folder, name));
  if (!result.ok) throw new Error(result.message);
  currentFolder = folder;
  return result.project;
}

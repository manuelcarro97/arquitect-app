import type { Project } from '../domain';
import { recallFolder, rememberFolder } from './folderMemory';
import {
  buildProjectFolder,
  MANIFEST_FILE,
  parseManifest,
  readProjectFolder,
  safeFileName,
  staleVersionFiles,
} from './projectFolder';

// File System Access API (Chrome/Edge). Declared locally because it is not in the standard DOM typings.
interface DirectoryPickerWindow {
  showDirectoryPicker?: (options: { id?: string; mode: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
}
interface PermissionAwareHandle {
  queryPermission?: (options: { mode: 'readwrite' }) => Promise<PermissionState>;
  requestPermission?: (options: { mode: 'readwrite' }) => Promise<PermissionState>;
}

const pickerWindow = window as unknown as DirectoryPickerWindow;
const PICKER_ID = 'arquitect-projects';
const UNSUPPORTED_MESSAGE = 'Este navegador no permite guardar carpetas. Usa Chrome o Edge.';

/** Folder of the open project in this session (also remembered in IndexedDB across reloads). */
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

/** Id of the project saved in this folder, or null if it holds no project. */
async function projectIdIn(folder: FileSystemDirectoryHandle): Promise<string | null> {
  const text = await readTextFile(folder, MANIFEST_FILE);
  if (text === null) return null;
  const manifest = parseManifest(text);
  return manifest.ok ? manifest.manifest.id : null;
}

/** Remembered folders need the user's permission again after a reload (one click, no folder picker). */
async function canWrite(folder: FileSystemDirectoryHandle): Promise<boolean> {
  const handle = folder as unknown as PermissionAwareHandle;
  if (!handle.queryPermission || !handle.requestPermission) return true;
  if ((await handle.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
  return (await handle.requestPermission({ mode: 'readwrite' })) === 'granted';
}

/**
 * Where to save after the user picks a folder: the folder itself if it already is this project,
 * otherwise a "<project name>" folder inside it. Never writes into another project or unrelated files.
 */
async function projectFolderFromPick(picked: FileSystemDirectoryHandle, project: Project): Promise<FileSystemDirectoryHandle> {
  const pickedId = await projectIdIn(picked);
  if (pickedId === project.id) return picked;
  if (pickedId !== null) {
    throw new Error(`«${picked.name}» es la carpeta de otro proyecto. Elige la carpeta donde quieres crear este.`);
  }
  const folder = await picked.getDirectoryHandle(safeFileName(project.name, 'proyecto'), { create: true });
  const existingId = await projectIdIn(folder);
  if (existingId !== null && existingId !== project.id) {
    throw new Error(`Ya hay otro proyecto en «${folder.name}». Cambia el nombre del proyecto o elige otra carpeta.`);
  }
  if (existingId === null && !(await isEmptyFolder(folder))) {
    throw new Error(`La carpeta «${folder.name}» ya existe y contiene otros ficheros. Elige otra ubicación.`);
  }
  return folder;
}

/** The project's known folder (this session or remembered), if it still holds this project and we may write. */
async function knownFolder(project: Project): Promise<FileSystemDirectoryHandle | null> {
  const folder = currentFolder ?? (await recallFolder(project.id));
  if (!folder) return null;
  try {
    if ((await projectIdIn(folder)) !== project.id) return null;
    return (await canWrite(folder)) ? folder : null;
  } catch {
    // Folder moved or deleted on disk.
    return null;
  }
}

/**
 * Saves the project as a folder: proyecto.json plus one .json per version.
 * Asks for a location only for a project never saved (or its folder was lost) and for "Guardar como".
 * With `previous` (the last saved project), only versions that changed are rewritten.
 * Returns the name of the folder written to, or null if the user cancelled.
 */
export async function saveProjectFolder(
  project: Project,
  { saveAs, previous }: { saveAs: boolean; previous: Project | null },
): Promise<string | null> {
  if (!pickerWindow.showDirectoryPicker) throw new Error(UNSUPPORTED_MESSAGE);
  try {
    let folder = saveAs ? null : await knownFolder(project);
    const sameFolder = folder !== null;
    if (!folder) {
      const picked = await pickerWindow.showDirectoryPicker({ id: PICKER_ID, mode: 'readwrite' });
      folder = await projectFolderFromPick(picked, project);
    }

    const previousManifest = await readTextFile(folder, MANIFEST_FILE);
    const { manifest, versions } = buildProjectFolder(project);
    const previousFiles = previous && sameFolder ? buildProjectFolder(previous).versions : [];

    // Versions first, manifest last: if something fails midway the old manifest still points to valid files.
    for (const [i, file] of versions.entries()) {
      const version = project.versions[i];
      const before = previous?.versions.find((v) => v.id === version.id);
      const unchanged = sameFolder && before === version && previousFiles.some((f) => f.name === file.name);
      if (!unchanged) await writeTextFile(folder, file.name, file.content);
    }
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

    currentFolder = folder;
    await rememberFolder(project.id, folder);
    return folder.name;
  } catch (error) {
    if (isAbortError(error)) return null;
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
  await rememberFolder(result.project.id, folder);
  return result.project;
}

import type { Project } from '../domain';
import { FILE_EXTENSION, parseProjectFile, serializeProject } from './projectFile';

// File System Access API (Chrome/Edge). Declared locally because it is not in the standard DOM typings.
interface FilePickerType {
  description: string;
  accept: Record<string, string[]>;
}
interface FileSystemAccessWindow {
  showSaveFilePicker?: (options: { suggestedName: string; types: FilePickerType[] }) => Promise<FileSystemFileHandle>;
  showOpenFilePicker?: (options: { types: FilePickerType[] }) => Promise<FileSystemFileHandle[]>;
}

const PICKER_TYPES: FilePickerType[] = [
  { description: 'Proyecto Arquitect App', accept: { 'application/json': [FILE_EXTENSION, '.json'] } },
];

const fsWindow = window as unknown as FileSystemAccessWindow;

/** Handle of the file last opened or saved, so "Guardar" overwrites it without asking again. */
let currentHandle: FileSystemFileHandle | null = null;

export function forgetCurrentFile(): void {
  currentHandle = null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function suggestedFileName(project: Project): string {
  const safeName = project.name.replace(/[\\/:*?"<>|]/g, '').trim() || 'proyecto';
  return `${safeName}${FILE_EXTENSION}`;
}

function downloadFallback(project: Project): void {
  const blob = new Blob([serializeProject(project)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedFileName(project);
  link.click();
  URL.revokeObjectURL(url);
}

/** Returns false if the user cancelled the dialog. */
export async function saveProjectFile(project: Project, { saveAs }: { saveAs: boolean }): Promise<boolean> {
  if (!fsWindow.showSaveFilePicker) {
    downloadFallback(project);
    return true;
  }
  try {
    if (saveAs || !currentHandle) {
      currentHandle = await fsWindow.showSaveFilePicker({
        suggestedName: suggestedFileName(project),
        types: PICKER_TYPES,
      });
    }
    const writable = await currentHandle.createWritable();
    await writable.write(serializeProject(project));
    await writable.close();
    return true;
  } catch (error) {
    if (isAbortError(error)) return false;
    throw error;
  }
}

function pickFileWithInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `${FILE_EXTENSION},.json,application/json`;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Returns null if the user cancelled. Throws an Error with a user-facing message if the file is invalid. */
export async function openProjectFile(): Promise<Project | null> {
  let file: File | null;
  let handle: FileSystemFileHandle | null = null;
  if (fsWindow.showOpenFilePicker) {
    try {
      [handle] = await fsWindow.showOpenFilePicker({ types: PICKER_TYPES });
      file = await handle.getFile();
    } catch (error) {
      if (isAbortError(error)) return null;
      throw error;
    }
  } else {
    file = await pickFileWithInput();
  }
  if (!file) return null;

  const parsed = parseProjectFile(await file.text());
  if (!parsed.ok) throw new Error(parsed.message);
  currentHandle = handle;
  return parsed.project;
}

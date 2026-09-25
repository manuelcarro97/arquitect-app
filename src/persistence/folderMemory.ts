import type { Id } from '../domain';

/**
 * Remembers, per project, the folder it was saved to or opened from, so "Guardar" keeps writing
 * there after a page reload. Folder handles can only be stored in IndexedDB (not localStorage).
 */
const DB_NAME = 'arquitect-app';
const STORE = 'project-folders';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** Remembering is a convenience: failures (private mode, blocked storage) just mean asking again. */
export async function rememberFolder(projectId: Id, folder: FileSystemDirectoryHandle): Promise<void> {
  try {
    await run('readwrite', (store) => store.put(folder, projectId));
  } catch {
    // Ignore: the user will be asked for the folder next time.
  }
}

export async function recallFolder(projectId: Id): Promise<FileSystemDirectoryHandle | null> {
  try {
    return ((await run('readonly', (store) => store.get(projectId))) as FileSystemDirectoryHandle | undefined) ?? null;
  } catch {
    return null;
  }
}

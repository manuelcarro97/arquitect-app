import type { Id } from '../../domain';
import { useAuthStore } from '../../cloud/authStore';
import { deleteCloudProject, loadCloudProject, saveCloudProject } from '../../cloud/cloudProjects';
import { backupFileName, parseBackup, serializeBackup } from '../../persistence/backupFile';
import { importProjectFolder } from '../../persistence/fileAccess';
import { useProjectStore } from '../../store/projectStore';

/** Shows a question with a confirm button; resolves true if the user confirms. */
export type AskConfirm = (message: string, confirmLabel: string) => Promise<boolean>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Save/open/import/backup actions shared by the top bar and keyboard shortcuts. `notify` shows a toast. */
export function createFileActions(notify: (text: string) => void, askConfirm: AskConfirm) {
  const signedInUid = (): string | null => useAuthStore.getState().user?.uid ?? null;

  const save = async () => {
    const uid = signedInUid();
    if (!uid) return notify('Entra con Google para guardar en la nube.');
    const { project, savedProject, markSaved } = useProjectStore.getState();
    try {
      let result = await saveCloudProject(uid, project, savedProject, { force: false });
      if (result === 'conflict') {
        const overwrite = await askConfirm(
          `«${project.name}» se ha guardado en la nube desde otro sitio después de que lo abrieras aquí. ¿Sobrescribirlo con lo que tienes ahora?`,
          'Sobrescribir',
        );
        if (!overwrite) return notify('No se ha guardado. Puedes abrir la copia de la nube desde Archivo → Abrir.');
        result = await saveCloudProject(uid, project, savedProject, { force: true });
      }
      // The project as it was when saving started: edits made meanwhile stay marked as unsaved.
      markSaved(project);
      notify('Guardado en la nube.');
    } catch (error) {
      notify(`No se pudo guardar: ${errorMessage(error)}`);
    }
  };

  const openCloud = async (projectId: Id) => {
    const uid = signedInUid();
    if (!uid) return;
    try {
      const project = await loadCloudProject(uid, projectId);
      useProjectStore.getState().loadProject(project, { fromFile: true });
      notify(`Abierto «${project.name}».`);
    } catch (error) {
      notify(`No se pudo abrir: ${errorMessage(error)}`);
    }
  };

  const deleteCloud = async (projectId: Id, name: string) => {
    const uid = signedInUid();
    if (!uid) return;
    try {
      await deleteCloudProject(uid, projectId);
      notify(`«${name}» se ha borrado de la nube.`);
    } catch (error) {
      notify(`No se pudo borrar: ${errorMessage(error)}`);
    }
  };

  const importFolder = async () => {
    try {
      const project = await importProjectFolder();
      if (!project) return;
      useProjectStore.getState().loadProject(project, { fromFile: false });
      notify(`Importado «${project.name}». Pulsa Guardar para subirlo a la nube.`);
    } catch (error) {
      notify(errorMessage(error));
    }
  };

  const downloadBackup = () => {
    const { project } = useProjectStore.getState();
    const url = URL.createObjectURL(new Blob([serializeBackup(project)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = backupFileName(project.name);
    link.click();
    // Freed a moment later: some mobile browsers start the download asynchronously.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const importBackup = async (file: File) => {
    const result = parseBackup(await file.text());
    if (!result.ok) return notify(result.message);
    useProjectStore.getState().loadProject(result.project, { fromFile: false });
    notify(`Importado «${result.project.name}». Pulsa Guardar para subirlo a la nube.`);
  };

  const createNew = () => useProjectStore.getState().newProject('Mi piso');

  return { save, openCloud, deleteCloud, importFolder, downloadBackup, importBackup, createNew };
}

export type FileActions = ReturnType<typeof createFileActions>;

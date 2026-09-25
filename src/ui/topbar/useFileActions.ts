import { forgetCurrentFolder, openProjectFolder, saveProjectFolder } from '../../persistence/fileAccess';
import { useProjectStore } from '../../store/projectStore';

/** Open/save/new actions shared by the top bar and keyboard shortcuts. `notify` shows a toast. */
export function createFileActions(notify: (text: string) => void) {
  const save = async (saveAs: boolean) => {
    const { project, savedProject, markSaved } = useProjectStore.getState();
    try {
      const folderName = await saveProjectFolder(project, { saveAs, previous: savedProject });
      if (folderName !== null) {
        markSaved(project);
        notify(`Guardado en la carpeta «${folderName}».`);
      }
    } catch (error) {
      notify(`No se pudo guardar: ${(error as Error).message}`);
    }
  };

  const open = async () => {
    try {
      const opened = await openProjectFolder();
      if (opened) {
        useProjectStore.getState().loadProject(opened, { fromFile: true });
        notify(`Abierto «${opened.name}».`);
      }
    } catch (error) {
      notify((error as Error).message);
    }
  };

  const createNew = () => {
    forgetCurrentFolder();
    useProjectStore.getState().newProject('Mi piso');
  };

  return { save, open, createNew };
}

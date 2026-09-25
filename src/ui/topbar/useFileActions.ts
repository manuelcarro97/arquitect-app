import { forgetCurrentFile, openProjectFile, saveProjectFile } from '../../persistence/fileAccess';
import { useProjectStore } from '../../store/projectStore';

/** Open/save/new actions shared by the top bar and keyboard shortcuts. `notify` shows a toast. */
export function createFileActions(notify: (text: string) => void) {
  const save = async (saveAs: boolean) => {
    const { project, markSaved } = useProjectStore.getState();
    try {
      if (await saveProjectFile(project, { saveAs })) {
        markSaved(project);
        notify('Proyecto guardado.');
      }
    } catch (error) {
      notify(`No se pudo guardar: ${(error as Error).message}`);
    }
  };

  const open = async () => {
    try {
      const opened = await openProjectFile();
      if (opened) {
        useProjectStore.getState().loadProject(opened, { fromFile: true });
        notify(`Abierto «${opened.name}».`);
      }
    } catch (error) {
      notify((error as Error).message);
    }
  };

  const createNew = () => {
    forgetCurrentFile();
    useProjectStore.getState().newProject('Mi piso');
  };

  return { save, open, createNew };
}

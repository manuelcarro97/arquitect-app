import { useState } from 'react';
import { forgetCurrentFile, openProjectFile, saveProjectFile } from '../persistence/fileAccess';
import { useProjectStore } from '../store/projectStore';
import { useUndoRedo } from '../store/selectors';

export function TopBar({ onMessage }: { onMessage: (text: string) => void }) {
  const project = useProjectStore((state) => state.project);
  const activeVersionId = useProjectStore((state) => state.activeVersionId);
  const mode = useProjectStore((state) => state.mode);
  const { renameProject, setActiveVersion, duplicateActiveVersion, setMode, newProject, loadProject } =
    useProjectStore.getState();
  const { canUndo, canRedo, undo, redo } = useUndoRedo();

  const [duplicateName, setDuplicateName] = useState<string | null>(null);
  const [confirmingNew, setConfirmingNew] = useState(false);

  const save = async (saveAs: boolean) => {
    try {
      if (await saveProjectFile(project, { saveAs })) onMessage('Proyecto guardado.');
    } catch (error) {
      onMessage(`No se pudo guardar: ${(error as Error).message}`);
    }
  };

  const open = async () => {
    try {
      const opened = await openProjectFile();
      if (opened) {
        loadProject(opened);
        onMessage(`Abierto «${opened.name}».`);
      }
    } catch (error) {
      onMessage((error as Error).message);
    }
  };

  const createNew = () => {
    forgetCurrentFile();
    newProject('Mi piso');
    setConfirmingNew(false);
  };

  const confirmDuplicate = () => {
    if (duplicateName === null) return;
    duplicateActiveVersion(duplicateName);
    setDuplicateName(null);
  };

  return (
    <header className="topbar">
      <div className="topbar__group">
        <span className="topbar__brand">Arquitect</span>
        <input
          key={project.id + project.name}
          className="topbar__project-name"
          defaultValue={project.name}
          aria-label="Nombre del proyecto"
          onBlur={(event) => event.currentTarget.value !== project.name && renameProject(event.currentTarget.value)}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
      </div>

      <div className="topbar__group">
        <label className="topbar__label">
          Versión
          <select value={activeVersionId} onChange={(event) => setActiveVersion(event.target.value)}>
            {project.versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.name}
              </option>
            ))}
          </select>
        </label>
        {duplicateName === null ? (
          <button onClick={() => setDuplicateName('')} title="Crea una copia de la versión actual para modificarla">
            Duplicar
          </button>
        ) : (
          <span className="inline-form">
            <input
              autoFocus
              placeholder="Nombre de la copia"
              value={duplicateName}
              onChange={(event) => setDuplicateName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') confirmDuplicate();
                if (event.key === 'Escape') setDuplicateName(null);
              }}
            />
            <button className="primary-button" onClick={confirmDuplicate}>
              Crear
            </button>
            <button onClick={() => setDuplicateName(null)}>Cancelar</button>
          </span>
        )}
      </div>

      <div className="topbar__group">
        <div className="segmented" role="group" aria-label="Modo">
          <button className={mode === 'structure' ? 'is-active' : ''} onClick={() => setMode('structure')}>
            Estructura
          </button>
          <button disabled title="Disponible en la siguiente fase">
            Distribución
          </button>
        </div>
      </div>

      <div className="topbar__group topbar__group--end">
        <button onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
          ↶
        </button>
        <button onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Y)">
          ↷
        </button>
        {confirmingNew ? (
          <span className="inline-form">
            ¿Descartar el proyecto actual?
            <button className="danger-button" onClick={createNew}>
              Sí, nuevo
            </button>
            <button onClick={() => setConfirmingNew(false)}>No</button>
          </span>
        ) : (
          <button onClick={() => setConfirmingNew(true)}>Nuevo</button>
        )}
        <button onClick={open}>Abrir…</button>
        <button onClick={() => save(false)} className="primary-button">
          Guardar
        </button>
        <button onClick={() => save(true)}>Guardar como…</button>
      </div>
    </header>
  );
}

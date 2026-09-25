import { useEffect, useMemo } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useUndoRedo } from '../store/selectors';
import { FileMenu } from './topbar/FileMenu';
import { createFileActions } from './topbar/useFileActions';
import { VersionControls } from './topbar/VersionControls';

export function TopBar({ onMessage }: { onMessage: (text: string) => void }) {
  const project = useProjectStore((state) => state.project);
  const hasUnsavedChanges = useProjectStore((state) => state.project !== state.savedProject);
  const mode = useProjectStore((state) => state.mode);
  const renameProject = useProjectStore((state) => state.renameProject);
  const setMode = useProjectStore((state) => state.setMode);
  const { canUndo, canRedo, undo, redo } = useUndoRedo();
  const fileActions = useMemo(() => createFileActions(onMessage), [onMessage]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void fileActions.save(event.shiftKey);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fileActions]);

  return (
    <header className="topbar">
      <span className="topbar__brand">Arquitect</span>

      <div className="topbar__section">
        <span className="topbar__caption">Proyecto</span>
        <input
          key={project.id + project.name}
          className="topbar__project-name"
          defaultValue={project.name}
          aria-label="Nombre del proyecto"
          title="Clic para renombrar el proyecto"
          onBlur={(event) => event.currentTarget.value !== project.name && renameProject(event.currentTarget.value)}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        />
        {hasUnsavedChanges && (
          <span className="topbar__unsaved" title="Hay cambios que no están guardados en el fichero">
            ● sin guardar
          </span>
        )}
        <FileMenu
          hasUnsavedChanges={hasUnsavedChanges}
          onNew={fileActions.createNew}
          onOpen={() => void fileActions.open()}
          onSaveAs={() => void fileActions.save(true)}
        />
      </div>

      <VersionControls />

      <div className="topbar__section">
        <span className="topbar__caption">Modo</span>
        <div className="segmented" role="group" aria-label="Modo de edición">
          <button
            className={mode === 'structure' ? 'is-active' : ''}
            onClick={() => setMode('structure')}
            title="Perímetro exterior del piso"
          >
            Estructura
          </button>
          <button disabled title="Tabiques, zonas y muebles — disponible en la siguiente fase">
            Distribución
          </button>
        </div>
      </div>

      <div className="topbar__section topbar__section--end">
        <button className="icon-only" onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
          ↶
        </button>
        <button className="icon-only" onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Y)">
          ↷
        </button>
        <button className="primary-button" onClick={() => void fileActions.save(false)} title="Guardar (Ctrl+S)">
          Guardar
        </button>
      </div>
    </header>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../cloud/authStore';
import { useProjectStore } from '../store/projectStore';
import { isPerimeterClosed } from '../domain';
import { selectActiveVersion, useUndoRedo } from '../store/selectors';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AccountButton } from './topbar/AccountButton';
import { FileMenu } from './topbar/FileMenu';
import { createFileActions, type AskConfirm } from './topbar/useFileActions';
import { VersionControls } from './topbar/VersionControls';

export function TopBar({ onMessage }: { onMessage: (text: string) => void }) {
  const project = useProjectStore((state) => state.project);
  const hasUnsavedChanges = useProjectStore((state) => state.project !== state.savedProject);
  const mode = useProjectStore((state) => state.mode);
  const renameProject = useProjectStore((state) => state.renameProject);
  const setMode = useProjectStore((state) => state.setMode);
  const perimeterClosed = useProjectStore((state) => isPerimeterClosed(selectActiveVersion(state).floor.perimeter));
  const { canUndo, canRedo, undo, redo } = useUndoRedo();
  const signedIn = useAuthStore((state) => state.user !== null);
  const [question, setQuestion] = useState<{ message: string; confirmLabel: string; answer: (ok: boolean) => void } | null>(
    null,
  );
  const askConfirm = useCallback<AskConfirm>(
    (message, confirmLabel) => new Promise((resolve) => setQuestion({ message, confirmLabel, answer: resolve })),
    [],
  );
  const fileActions = useMemo(() => createFileActions(onMessage, askConfirm), [onMessage, askConfirm]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void fileActions.save();
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
          <span className="topbar__unsaved" title="Hay cambios que no están guardados en la nube">
            ● sin guardar
          </span>
        )}
        <FileMenu hasUnsavedChanges={hasUnsavedChanges} actions={fileActions} />
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
          <button
            className={mode === 'layout' ? 'is-active' : ''}
            disabled={!perimeterClosed}
            onClick={() => setMode('layout')}
            title={perimeterClosed ? 'Tabiques y zonas del interior' : 'Cierra el perímetro para distribuir el interior'}
          >
            Distribución
          </button>
          <button
            className={mode === 'furnish' ? 'is-active' : ''}
            disabled={!perimeterClosed}
            onClick={() => setMode('furnish')}
            title={perimeterClosed ? 'Colocar muebles (paredes y tabiques bloqueados)' : 'Cierra el perímetro para amueblar'}
          >
            Amueblar
          </button>
          <button
            className={mode === 'finishes' ? 'is-active' : ''}
            disabled={!perimeterClosed}
            onClick={() => setMode('finishes')}
            title={perimeterClosed ? 'Pintura, revestimientos y suelos' : 'Cierra el perímetro para elegir acabados'}
          >
            Acabados
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
        <button
          className="primary-button"
          onClick={() => void fileActions.save()}
          disabled={!signedIn}
          title={signedIn ? 'Guardar en la nube (Ctrl+S)' : 'Entra con Google para guardar en la nube'}
        >
          Guardar
        </button>
        <AccountButton onMessage={onMessage} />
      </div>

      {question && (
        <ConfirmDialog
          message={question.message}
          confirmLabel={question.confirmLabel}
          onAnswer={(confirmed) => {
            question.answer(confirmed);
            setQuestion(null);
          }}
        />
      )}
    </header>
  );
}

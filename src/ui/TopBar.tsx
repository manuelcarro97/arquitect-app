import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../cloud/authStore';
import { useProjectStore } from '../store/projectStore';
import { useUndoRedo } from '../store/selectors';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Popover } from './components/Popover';
import { useIsCompact } from './hooks/useMediaQuery';
import { AccountButton } from './topbar/AccountButton';
import { FileMenu } from './topbar/FileMenu';
import { ModeSwitcher } from './topbar/ModeSwitcher';
import { createFileActions, type AskConfirm } from './topbar/useFileActions';
import { VersionControls } from './topbar/VersionControls';

function ProjectNameInput() {
  const project = useProjectStore((state) => state.project);
  const renameProject = useProjectStore((state) => state.renameProject);
  return (
    <input
      key={project.id + project.name}
      className="topbar__project-name"
      defaultValue={project.name}
      aria-label="Nombre del proyecto"
      title="Clic para renombrar el proyecto"
      onBlur={(event) => event.currentTarget.value !== project.name && renameProject(event.currentTarget.value)}
      onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
    />
  );
}

function UnsavedMark({ short }: { short?: boolean }) {
  return (
    <span className="topbar__unsaved" title="Hay cambios que no están guardados en la nube">
      {short ? '●' : '● sin guardar'}
    </span>
  );
}

export function TopBar({ onMessage }: { onMessage: (text: string) => void }) {
  const projectName = useProjectStore((state) => state.project.name);
  const hasUnsavedChanges = useProjectStore((state) => state.project !== state.savedProject);
  const { canUndo, canRedo, undo, redo } = useUndoRedo();
  const signedIn = useAuthStore((state) => state.user !== null);
  const compact = useIsCompact();
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

  const saveButton = (
    <button
      className="primary-button"
      onClick={() => void fileActions.save()}
      disabled={!signedIn}
      title={signedIn ? 'Guardar en la nube (Ctrl+S)' : 'Entra con Google para guardar en la nube'}
    >
      Guardar
    </button>
  );
  const undoButton = (
    <button className="icon-only" onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)" aria-label="Deshacer">
      ↶
    </button>
  );
  const redoButton = (
    <button className="icon-only" onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Y)" aria-label="Rehacer">
      ↷
    </button>
  );
  const dialog = question && (
    <ConfirmDialog
      message={question.message}
      confirmLabel={question.confirmLabel}
      onAnswer={(confirmed) => {
        question.answer(confirmed);
        setQuestion(null);
      }}
    />
  );

  // Phones: project, file and version controls go into the ☰ menu; the modes move to a bar at the bottom.
  if (compact) {
    return (
      <header className="topbar topbar--compact">
        <Popover label="☰" title="Proyecto, archivo y versiones" buttonClassName="icon-only">
          {() => (
            <div className="menu menu--form topbar__menu">
              <label className="field">
                Proyecto
                <ProjectNameInput />
              </label>
              <FileMenu hasUnsavedChanges={hasUnsavedChanges} actions={fileActions} />
              <VersionControls />
            </div>
          )}
        </Popover>
        <span className="topbar__compact-name">{projectName}</span>
        {hasUnsavedChanges && <UnsavedMark short />}
        <div className="topbar__compact-actions">
          {undoButton}
          {redoButton}
          {saveButton}
          <AccountButton onMessage={onMessage} />
        </div>
        {dialog}
      </header>
    );
  }

  return (
    <header className="topbar">
      <span className="topbar__brand">Arquitect</span>

      <div className="topbar__section">
        <span className="topbar__caption">Proyecto</span>
        <ProjectNameInput />
        {hasUnsavedChanges && <UnsavedMark />}
        <FileMenu hasUnsavedChanges={hasUnsavedChanges} actions={fileActions} />
      </div>

      <VersionControls />

      <div className="topbar__section">
        <span className="topbar__caption">Modo</span>
        <ModeSwitcher variant="segmented" />
      </div>

      <div className="topbar__section topbar__section--end">
        {undoButton}
        {redoButton}
        {saveButton}
        <AccountButton onMessage={onMessage} />
      </div>

      {dialog}
    </header>
  );
}

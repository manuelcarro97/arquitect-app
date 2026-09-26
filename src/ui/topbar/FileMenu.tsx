import { useRef, useState } from 'react';
import { useAuthStore } from '../../cloud/authStore';
import { canImportFolders } from '../../persistence/fileAccess';
import { Popover } from '../components/Popover';
import { CloudProjectList } from './CloudProjectList';
import type { FileActions } from './useFileActions';

interface FileMenuProps {
  hasUnsavedChanges: boolean;
  actions: FileActions;
}

type View = 'main' | 'confirmNew' | 'cloud';

export function FileMenu({ hasUnsavedChanges, actions }: FileMenuProps) {
  const [view, setView] = useState<View>('main');
  const uid = useAuthStore((state) => state.user?.uid ?? null);
  const backupInput = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Hidden picker for "Importar copia"; on phones it also offers Drive, Downloads… */}
      <input
        ref={backupInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void actions.importBackup(file);
        }}
      />
      <Popover label="Archivo ▾" title="Nuevo, abrir, importar y copias">
        {(close) => {
          const run = (action: () => void) => {
            close();
            setView('main');
            action();
          };

          if (view === 'confirmNew') {
            return (
              <div className="menu">
                <p className="menu__text">Hay cambios sin guardar. ¿Empezar un proyecto nuevo igualmente?</p>
                <div className="menu__actions">
                  <button onClick={() => setView('main')}>Cancelar</button>
                  <button className="danger-button" onClick={() => run(actions.createNew)}>
                    Descartar y crear
                  </button>
                </div>
              </div>
            );
          }

          if (view === 'cloud' && uid) {
            return (
              <CloudProjectList
                uid={uid}
                onOpen={(id) => run(() => void actions.openCloud(id))}
                onDelete={actions.deleteCloud}
                onBack={() => setView('main')}
              />
            );
          }

          return (
            <div className="menu">
              <button
                className="menu__item"
                onClick={() => (hasUnsavedChanges ? setView('confirmNew') : run(actions.createNew))}
              >
                Nuevo proyecto
              </button>
              <button
                className="menu__item"
                disabled={!uid}
                title={uid ? 'Tus proyectos guardados en la nube' : 'Entra con Google para ver tus proyectos'}
                onClick={() => setView('cloud')}
              >
                Abrir…
              </button>
              <hr className="menu__separator" />
              <button className="menu__item" onClick={() => run(actions.downloadBackup)}>
                Descargar copia (.json)
              </button>
              <button className="menu__item" onClick={() => run(() => backupInput.current?.click())}>
                Importar copia (.json)…
              </button>
              {canImportFolders() && (
                <button
                  className="menu__item"
                  title="Proyectos guardados en carpetas con versiones anteriores de la app"
                  onClick={() => run(() => void actions.importFolder())}
                >
                  Importar carpeta antigua…
                </button>
              )}
            </div>
          );
        }}
      </Popover>
    </>
  );
}

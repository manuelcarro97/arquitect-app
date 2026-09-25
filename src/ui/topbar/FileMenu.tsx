import { useState } from 'react';
import { Popover } from '../components/Popover';

interface FileMenuProps {
  hasUnsavedChanges: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSaveAs: () => void;
}

export function FileMenu({ hasUnsavedChanges, onNew, onOpen, onSaveAs }: FileMenuProps) {
  const [confirmingNew, setConfirmingNew] = useState(false);

  return (
    <Popover label="Archivo ▾" title="Nuevo, abrir y guardar como">
      {(close) =>
        confirmingNew ? (
          <div className="menu">
            <p className="menu__text">Hay cambios sin guardar. ¿Empezar un proyecto nuevo igualmente?</p>
            <div className="menu__actions">
              <button onClick={() => setConfirmingNew(false)}>Cancelar</button>
              <button
                className="danger-button"
                onClick={() => {
                  onNew();
                  setConfirmingNew(false);
                  close();
                }}
              >
                Descartar y crear
              </button>
            </div>
          </div>
        ) : (
          <div className="menu">
            <button
              className="menu__item"
              onClick={() => {
                if (hasUnsavedChanges) return setConfirmingNew(true);
                onNew();
                close();
              }}
            >
              Nuevo proyecto
            </button>
            <button
              className="menu__item"
              onClick={() => {
                close();
                onOpen();
              }}
            >
              Abrir…
            </button>
            <button
              className="menu__item"
              onClick={() => {
                close();
                onSaveAs();
              }}
            >
              Guardar como…
            </button>
          </div>
        )
      }
    </Popover>
  );
}

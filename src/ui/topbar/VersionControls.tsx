import { useState } from 'react';
import { useProjectStore, type NewVersionSource } from '../../store/projectStore';
import { selectActiveVersion } from '../../store/selectors';
import { Popover } from '../components/Popover';

function NewVersionForm({ close }: { close: () => void }) {
  const project = useProjectStore((state) => state.project);
  const activeVersionName = useProjectStore((state) => selectActiveVersion(state).name);
  const createVersion = useProjectStore((state) => state.createVersion);
  const [name, setName] = useState(`Versión ${project.versions.length + 1}`);
  const [source, setSource] = useState<NewVersionSource>('current');

  const submit = () => {
    if (name.trim() === '') return;
    createVersion(name, source);
    close();
  };

  return (
    <form
      className="menu menu--form"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="field">
        Nombre
        <input autoFocus value={name} onChange={(event) => setName(event.target.value)} onFocus={(e) => e.target.select()} />
      </label>

      <fieldset className="choice-group">
        <legend>Partir de</legend>
        <label className={`choice ${source === 'current' ? 'is-checked' : ''}`}>
          <input type="radio" checked={source === 'current'} onChange={() => setSource('current')} />
          <span>
            <strong>Copia de «{activeVersionName}»</strong>
            <small>Mismo perímetro, tabiques y muebles. Para probar cambios sobre lo que ya tienes.</small>
          </span>
        </label>
        <label className={`choice ${source === 'empty' ? 'is-checked' : ''}`}>
          <input type="radio" checked={source === 'empty'} onChange={() => setSource('empty')} />
          <span>
            <strong>Desde cero</strong>
            <small>Plano vacío: hay que dibujar el perímetro de nuevo.</small>
          </span>
        </label>
      </fieldset>

      <div className="menu__actions">
        <button type="button" onClick={close}>
          Cancelar
        </button>
        <button type="submit" className="primary-button" disabled={name.trim() === ''}>
          Crear versión
        </button>
      </div>
    </form>
  );
}

function VersionOptions({ close }: { close: () => void }) {
  const activeVersion = useProjectStore(selectActiveVersion);
  const versionCount = useProjectStore((state) => state.project.versions.length);
  const renameActiveVersion = useProjectStore((state) => state.renameActiveVersion);
  const removeActiveVersion = useProjectStore((state) => state.removeActiveVersion);
  const [view, setView] = useState<'menu' | 'rename' | 'confirm-delete'>('menu');
  const [name, setName] = useState(activeVersion.name);

  if (view === 'rename') {
    return (
      <form
        className="menu menu--form"
        onSubmit={(event) => {
          event.preventDefault();
          renameActiveVersion(name);
          close();
        }}
      >
        <label className="field">
          Nuevo nombre
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} onFocus={(e) => e.target.select()} />
        </label>
        <div className="menu__actions">
          <button type="button" onClick={() => setView('menu')}>
            Cancelar
          </button>
          <button type="submit" className="primary-button" disabled={name.trim() === ''}>
            Renombrar
          </button>
        </div>
      </form>
    );
  }

  if (view === 'confirm-delete') {
    return (
      <div className="menu">
        <p className="menu__text">
          ¿Eliminar la versión «{activeVersion.name}»? Puedes recuperarla con Deshacer (Ctrl+Z).
        </p>
        <div className="menu__actions">
          <button onClick={() => setView('menu')}>Cancelar</button>
          <button
            className="danger-button"
            onClick={() => {
              removeActiveVersion();
              close();
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="menu">
      <button className="menu__item" onClick={() => setView('rename')}>
        Renombrar versión
      </button>
      <button
        className="menu__item menu__item--danger"
        disabled={versionCount === 1}
        title={versionCount === 1 ? 'Es la única versión del proyecto' : undefined}
        onClick={() => setView('confirm-delete')}
      >
        Eliminar versión
      </button>
    </div>
  );
}

export function VersionControls() {
  const versions = useProjectStore((state) => state.project.versions);
  const activeVersionId = useProjectStore((state) => selectActiveVersion(state).id);
  const setActiveVersion = useProjectStore((state) => state.setActiveVersion);

  return (
    <div className="topbar__section">
      <span className="topbar__caption">Versión</span>
      <select
        className="topbar__version-select"
        value={activeVersionId}
        aria-label="Versión activa"
        onChange={(event) => setActiveVersion(event.target.value)}
      >
        {versions.map((version) => (
          <option key={version.id} value={version.id}>
            {version.name}
          </option>
        ))}
      </select>
      <Popover label="+ Nueva versión" title="Crear otra versión del proyecto">
        {(close) => <NewVersionForm close={close} />}
      </Popover>
      <Popover label="⋯" title="Opciones de la versión" buttonClassName="icon-only">
        {(close) => <VersionOptions close={close} />}
      </Popover>
    </div>
  );
}

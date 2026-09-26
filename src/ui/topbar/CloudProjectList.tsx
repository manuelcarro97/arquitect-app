import { useEffect, useState } from 'react';
import type { Id } from '../../domain';
import { listCloudProjects, type CloudProjectSummary } from '../../cloud/cloudProjects';

interface CloudProjectListProps {
  uid: string;
  onOpen: (id: Id) => void;
  onDelete: (id: Id, name: string) => Promise<void>;
  onBack: () => void;
}

type ListState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; projects: CloudProjectSummary[] };

const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' });

/** The user's projects saved in the cloud, to open or delete one. */
export function CloudProjectList({ uid, onOpen, onDelete, onBack }: CloudProjectListProps) {
  const [list, setList] = useState<ListState>({ status: 'loading' });
  const [confirmingDelete, setConfirmingDelete] = useState<CloudProjectSummary | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listCloudProjects(uid).then(
      (projects) => !cancelled && setList({ status: 'ready', projects }),
      (error: Error) => !cancelled && setList({ status: 'error', message: error.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [uid, reload]);

  if (confirmingDelete) {
    return (
      <div className="menu">
        <p className="menu__text">¿Borrar «{confirmingDelete.name}» de la nube con todas sus versiones? No se puede deshacer.</p>
        <div className="menu__actions">
          <button onClick={() => setConfirmingDelete(null)}>Cancelar</button>
          <button
            className="danger-button"
            onClick={() => {
              void onDelete(confirmingDelete.id, confirmingDelete.name).then(() => setReload((n) => n + 1));
              setConfirmingDelete(null);
            }}
          >
            Borrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="menu cloud-list">
      <button className="menu__item" onClick={onBack}>
        ‹ Volver
      </button>
      {list.status === 'loading' && <p className="menu__text">Cargando proyectos…</p>}
      {list.status === 'error' && <p className="menu__text">{list.message}</p>}
      {list.status === 'ready' && list.projects.length === 0 && (
        <p className="menu__text">Todavía no has guardado ningún proyecto en la nube.</p>
      )}
      {list.status === 'ready' &&
        list.projects.map((project) => (
          <div key={project.id} className="cloud-list__row">
            <button className="menu__item cloud-list__open" onClick={() => onOpen(project.id)}>
              <strong>{project.name}</strong>
              <small>{project.updatedAt ? dateFormat.format(project.updatedAt) : 'guardando…'}</small>
            </button>
            <button
              className="icon-only"
              title={`Borrar «${project.name}» de la nube`}
              aria-label={`Borrar ${project.name}`}
              onClick={() => setConfirmingDelete(project)}
            >
              🗑
            </button>
          </div>
        ))}
    </div>
  );
}

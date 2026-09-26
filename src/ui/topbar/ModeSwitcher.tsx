import { isPerimeterClosed } from '../../domain';
import { useProjectStore, type EditorMode } from '../../store/projectStore';
import { selectActiveVersion } from '../../store/selectors';

interface ModeInfo {
  mode: EditorMode;
  label: string;
  title: string;
  /** Explanation when the perimeter is still open (every mode but Estructura needs it closed). */
  needsClosedTitle?: string;
}

const MODES: ModeInfo[] = [
  { mode: 'structure', label: 'Estructura', title: 'Perímetro exterior del piso' },
  {
    mode: 'layout',
    label: 'Distribución',
    title: 'Tabiques y zonas del interior',
    needsClosedTitle: 'Cierra el perímetro para distribuir el interior',
  },
  {
    mode: 'furnish',
    label: 'Amueblar',
    title: 'Colocar muebles (paredes y tabiques bloqueados)',
    needsClosedTitle: 'Cierra el perímetro para amueblar',
  },
  {
    mode: 'finishes',
    label: 'Acabados',
    title: 'Pintura, revestimientos y suelos',
    needsClosedTitle: 'Cierra el perímetro para elegir acabados',
  },
];

/** The four editing modes: a segmented control in the top bar, or a tab bar at the bottom on phones. */
export function ModeSwitcher({ variant }: { variant: 'segmented' | 'tabbar' }) {
  const mode = useProjectStore((state) => state.mode);
  const setMode = useProjectStore((state) => state.setMode);
  const perimeterClosed = useProjectStore((state) => isPerimeterClosed(selectActiveVersion(state).floor.perimeter));

  return (
    <div className={variant === 'segmented' ? 'segmented' : 'mode-tabbar'} role="group" aria-label="Modo de edición">
      {MODES.map((info) => {
        const locked = info.needsClosedTitle !== undefined && !perimeterClosed;
        return (
          <button
            key={info.mode}
            className={mode === info.mode ? 'is-active' : ''}
            disabled={locked}
            onClick={() => setMode(info.mode)}
            title={locked ? info.needsClosedTitle : info.title}
          >
            {info.label}
          </button>
        );
      })}
    </div>
  );
}

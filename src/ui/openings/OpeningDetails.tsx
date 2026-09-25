import { findWall, invalidOpeningIds, type Floor, type Opening, type WallGeometry } from '../../domain';
import { useProjectStore } from '../../store/projectStore';
import { useActiveFloor } from '../../store/selectors';
import { NumberCell } from '../components/NumberCell';
import { OPENING_PRESETS, presetsOf } from './presets';

/** Human name of a wall: "Pared exterior 3" or "Tabique 2". */
export function wallLabel(floor: Floor, wall: WallGeometry): string {
  if (wall.kind === 'perimeter') {
    return `Pared exterior ${floor.perimeter.segments.findIndex((s) => s.id === wall.id) + 1}`;
  }
  return `Tabique ${floor.partitions.findIndex((p) => p.id === wall.id) + 1}`;
}

function matchingPresetId(opening: Opening): string {
  const preset = OPENING_PRESETS.find(
    (p) => p.type === opening.type && p.width === opening.width && p.height === opening.height && p.sillHeight === opening.sillHeight,
  );
  return preset?.id ?? 'custom';
}

function Measure({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  return (
    <label className="field">
      {label}
      <NumberCell key={`${label}-${value}`} value={value} autoFocus={false} ariaLabel={label} onCommit={onCommit} />
    </label>
  );
}

/** Side panel section for the selected door or window. Renders nothing when no opening is selected. */
export function OpeningDetails() {
  const floor = useActiveFloor();
  const selection = useProjectStore((state) => state.selection);
  const updateOpening = useProjectStore((state) => state.updateOpening);
  const removeOpening = useProjectStore((state) => state.removeOpening);
  const openElevation = useProjectStore((state) => state.openElevation);

  const opening = selection?.kind === 'opening' ? floor.openings.find((o) => o.id === selection.id) : undefined;
  const wall = opening && findWall(floor, opening.wallId);
  if (!opening || !wall) return null;

  const isDoor = opening.type === 'door';
  const invalid = invalidOpeningIds(floor).includes(opening.id);
  const toEnd = wall.length - opening.offset - opening.width;
  const update = (changes: Partial<Opening>) => updateOpening(opening.id, changes);

  return (
    <section className="panel panel--details">
      <h2 className="panel__title">{isDoor ? '🚪 Puerta' : '🪟 Ventana'}</h2>
      <div className="details__meta">
        En {wallLabel(floor, wall)} ({Math.round(wall.length)} cm)
      </div>
      {invalid && <p className="status status--warn">Ya no cabe en su pared: ajusta la posición o las medidas.</p>}

      <label className="field">
        Medida típica
        <select
          value={matchingPresetId(opening)}
          onChange={(event) => {
            const preset = OPENING_PRESETS.find((p) => p.id === event.target.value);
            if (preset) update({ width: preset.width, height: preset.height, sillHeight: preset.sillHeight });
          }}
        >
          <option value="custom" disabled>
            Personalizada
          </option>
          {presetsOf(opening.type).map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <div className="field-grid">
        <Measure label="Ancho (cm)" value={opening.width} onCommit={(width) => update({ width })} />
        <Measure label="Alto (cm)" value={opening.height} onCommit={(height) => update({ height })} />
        {!isDoor && <Measure label="Alféizar (cm)" value={opening.sillHeight} onCommit={(sillHeight) => update({ sillHeight })} />}
        <Measure label="Desde el inicio (cm)" value={opening.offset} onCommit={(offset) => update({ offset })} />
        <Measure
          label="Hasta el final (cm)"
          value={toEnd}
          onCommit={(distance) => update({ offset: wall.length - opening.width - distance })}
        />
      </div>

      {isDoor && (
        <div className="button-row">
          <button onClick={() => update({ hinge: opening.hinge === 'end' ? 'start' : 'end' })} title="Pasa la bisagra al otro lado del hueco">
            ↔ Cambiar bisagra
          </button>
          <button onClick={() => update({ swingSide: opening.swingSide === 'B' ? 'A' : 'B' })} title="La puerta abre hacia el otro lado de la pared">
            ⇅ Cambiar sentido
          </button>
        </div>
      )}

      <div className="button-row">
        <button onClick={() => openElevation(wall.id)}>Ver alzado de la pared</button>
        <button className="danger-link" onClick={() => removeOpening(opening.id)}>
          Borrar
        </button>
      </div>
    </section>
  );
}

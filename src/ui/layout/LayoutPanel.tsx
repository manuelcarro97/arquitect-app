import {
  distance,
  invalidPartitionIds,
  perimeterPolygon,
  polygonArea,
  squareCmToSquareM,
  zoneAreaM2,
  type Partition,
  type Zone,
} from '../../domain';
import { useProjectStore } from '../../store/projectStore';
import { useActiveFloor } from '../../store/selectors';
import { NumberCell } from '../components/NumberCell';
import { FurnitureCatalog } from '../furniture/FurniturePanels';
import { formatM2 } from '../format';

const ROOM_NAMES = [
  'Salón',
  'Comedor',
  'Cocina',
  'Dormitorio',
  'Dormitorio principal',
  'Baño',
  'Aseo',
  'Pasillo',
  'Recibidor',
  'Despacho',
  'Vestidor',
  'Lavadero',
  'Terraza',
  'Trastero',
];

function PartitionDetails({ partition, invalid }: { partition: Partition; invalid: boolean }) {
  const setPartitionLength = useProjectStore((state) => state.setPartitionLength);
  const removePartition = useProjectStore((state) => state.removePartition);
  const openElevation = useProjectStore((state) => state.openElevation);
  const length = distance(partition.a, partition.b);

  return (
    <section className="details">
      <h3 className="details__title">Tabique seleccionado</h3>
      {invalid && <p className="status status--warn">Se sale del perímetro: muévelo o bórralo.</p>}
      <label className="field">
        Longitud (cm) — se mantiene el extremo inicial
        <NumberCell
          key={`${partition.id}-${length}`}
          value={length}
          autoFocus={false}
          ariaLabel="Longitud del tabique"
          onCommit={(value) => setPartitionLength(partition.id, value)}
        />
      </label>
      <div className="details__meta">Grosor {partition.thickness} cm · altura {partition.height} cm</div>
      <div className="button-row">
        <button onClick={() => openElevation(partition.id)}>Ver alzado (puertas)</button>
        <button className="danger-link" onClick={() => removePartition(partition.id)}>
          Borrar tabique
        </button>
      </div>
    </section>
  );
}

function ZoneRow({ zone, selected }: { zone: Zone; selected: boolean }) {
  const select = useProjectStore((state) => state.select);
  const updateZone = useProjectStore((state) => state.updateZone);
  const removeZone = useProjectStore((state) => state.removeZone);

  return (
    <li
      className={`zone-row ${selected ? 'is-selected' : ''}`}
      onClick={() => select({ kind: 'zone', id: zone.id })}
      onFocus={() => select({ kind: 'zone', id: zone.id })}
    >
      <input
        type="color"
        className="zone-row__color"
        value={zone.color}
        aria-label={`Color de ${zone.name}`}
        onChange={(event) => updateZone(zone.id, { color: event.target.value })}
      />
      <input
        key={`${zone.id}-${zone.name}`}
        className="zone-row__name"
        defaultValue={zone.name}
        list="room-names"
        aria-label="Nombre de la zona"
        onBlur={(event) => event.currentTarget.value !== zone.name && updateZone(zone.id, { name: event.currentTarget.value })}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      />
      <span className="zone-row__area">{formatM2(zoneAreaM2(zone))}</span>
      <button
        className="icon-button"
        title="Borrar zona"
        onClick={(event) => {
          event.stopPropagation();
          removeZone(zone.id);
        }}
      >
        ✕
      </button>
    </li>
  );
}

export function LayoutPanel() {
  const floor = useActiveFloor();
  const selection = useProjectStore((state) => state.selection);
  const polygon = perimeterPolygon(floor.perimeter);
  const totalArea = polygon ? squareCmToSquareM(polygonArea(polygon)) : null;
  const zonesArea = floor.zones.reduce((sum, zone) => sum + zoneAreaM2(zone), 0);
  const invalid = new Set(invalidPartitionIds(floor));
  const selectedPartition =
    selection?.kind === 'partition' ? floor.partitions.find((p) => p.id === selection.id) : undefined;

  return (
    <section className="panel">
      <h2 className="panel__title">Distribución</h2>

      <div className="summary">
        <div>
          <span>Superficie del piso</span>
          <strong>{totalArea !== null ? formatM2(totalArea) : '—'}</strong>
        </div>
        <div>
          <span>Tabiques</span>
          <strong>{floor.partitions.length}</strong>
        </div>
        <div>
          <span>Zonas marcadas</span>
          <strong>{formatM2(zonesArea)}</strong>
        </div>
      </div>

      {invalid.size > 0 && (
        <p className="status status--warn">
          {invalid.size === 1 ? 'Hay 1 tabique' : `Hay ${invalid.size} tabiques`} fuera del perímetro (en rojo).
        </p>
      )}

      <FurnitureCatalog />

      {selectedPartition && <PartitionDetails partition={selectedPartition} invalid={invalid.has(selectedPartition.id)} />}

      <section className="details">
        <h3 className="details__title">Zonas</h3>
        {floor.zones.length === 0 ? (
          <p className="panel__help">Usa la herramienta ⬠ Zona para marcar habitaciones con nombre, color y m².</p>
        ) : (
          <ul className="zone-list">
            {floor.zones.map((zone) => (
              <ZoneRow key={zone.id} zone={zone} selected={selection?.kind === 'zone' && selection.id === zone.id} />
            ))}
          </ul>
        )}
        <datalist id="room-names">
          {ROOM_NAMES.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </section>

      <p className="panel__help">
        Los tabiques se enganchan a esquinas y a cualquier punto de una pared. Las zonas no siguen a los tabiques al
        moverlos: ajusta sus puntos arrastrándolos.
      </p>
    </section>
  );
}

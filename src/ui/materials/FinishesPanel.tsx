import { useState } from 'react';
import { findWall, zoneAreaM2, type MaterialId } from '../../domain';
import { useProjectStore } from '../../store/projectStore';
import { useActiveFloor } from '../../store/selectors';
import { formatM2 } from '../format';
import { viewpointLabel } from '../openings/ElevationMiniMap';
import { wallLabel } from '../openings/OpeningDetails';
import { PAINT_COLORS, materialInfo, materialsFor, paintId, type MaterialTarget } from './materials';

interface MaterialPickerProps {
  target: MaterialTarget;
  current: MaterialId | undefined;
  onPick: (material: MaterialId | null) => void;
}

/** Paints (walls only), any custom colour and the textured materials for walls or floors. */
function MaterialPicker({ target, current, onPick }: MaterialPickerProps) {
  const currentInfo = materialInfo(current);
  const [customColor, setCustomColor] = useState(currentInfo?.pattern.type === 'plain' ? currentInfo.color : '#ffffff');

  return (
    <div className="material-picker">
      <div className="material-picker__current">
        Actual: <strong>{currentInfo?.name ?? 'Sin acabado'}</strong>
        {current && (
          <button className="danger-link" onClick={() => onPick(null)}>
            Quitar
          </button>
        )}
      </div>

      {target === 'wall' && (
        <>
          <div className="material-picker__label">Pintura</div>
          <div className="swatch-grid">
            {PAINT_COLORS.map((paint) => (
              <button
                key={paint.color}
                className={`swatch ${current === paintId(paint.color) ? 'is-active' : ''}`}
                style={{ background: paint.color }}
                title={paint.name}
                aria-label={`Pintura ${paint.name}`}
                onClick={() => onPick(paintId(paint.color))}
              />
            ))}
          </div>
          <label className="material-picker__custom">
            Otro color
            <input type="color" value={customColor} onChange={(event) => setCustomColor(event.target.value)} />
            <button onClick={() => onPick(paintId(customColor))}>Aplicar</button>
          </label>
        </>
      )}

      <div className="material-picker__label">{target === 'wall' ? 'Revestimientos' : 'Suelos'}</div>
      <ul className="catalog-list">
        {materialsFor(target).map((material) => (
          <li key={material.id}>
            <button
              className={`catalog-item ${current === material.id ? 'is-active' : ''}`}
              onClick={() => onPick(material.id)}
            >
              <span className="catalog-item__swatch" style={{ background: material.color }} />
              <span className="catalog-item__name">{material.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Side panel of Acabados mode: material of the selected wall face, zone floor or general floor. */
export function FinishesPanel() {
  const floor = useActiveFloor();
  const selection = useProjectStore((state) => state.selection);
  const setWallFinish = useProjectStore((state) => state.setWallFinish);
  const setZoneFloorFinish = useProjectStore((state) => state.setZoneFloorFinish);
  const setDefaultFloorFinish = useProjectStore((state) => state.setDefaultFloorFinish);
  const setZoneWallsFinish = useProjectStore((state) => state.setZoneWallsFinish);

  const wall = selection?.kind === 'wallFace' ? findWall(floor, selection.id) : undefined;
  const zone = selection?.kind === 'zone' ? floor.zones.find((z) => z.id === selection.id) : undefined;

  return (
    <section className="panel">
      <h2 className="panel__title">Acabados</h2>

      {wall && selection?.side ? (
        <section className="details">
          <h3 className="details__title">
            {wallLabel(floor, wall)} · cara {viewpointLabel(floor, wall, selection.side).replace('desde ', 'hacia ')}
          </h3>
          <MaterialPicker
            target="wall"
            current={selection.side === 'A' ? wall.finishA : wall.finishB}
            onPick={(material) => selection.side && setWallFinish(wall.id, selection.side, material)}
          />
        </section>
      ) : zone ? (
        <>
          <section className="details">
            <h3 className="details__title">
              Suelo de {zone.name} ({formatM2(zoneAreaM2(zone))})
            </h3>
            <MaterialPicker target="floor" current={zone.floorFinish} onPick={(material) => setZoneFloorFinish(zone.id, material)} />
          </section>
          <section className="details">
            <h3 className="details__title">Todas las paredes de {zone.name}</h3>
            <p className="panel__help">Aplica el material a cada cara de pared que da a esta zona.</p>
            <MaterialPicker target="wall" current={undefined} onPick={(material) => setZoneWallsFinish(zone.id, material)} />
          </section>
        </>
      ) : selection?.kind === 'floor' ? (
        <section className="details">
          <h3 className="details__title">Suelo general</h3>
          <p className="panel__help">Se usa donde no hay una zona con su propio suelo.</p>
          <MaterialPicker target="floor" current={floor.floorFinish} onPick={setDefaultFloorFinish} />
        </section>
      ) : (
        <p className="panel__help">
          Haz clic en una pared (en el lado que quieras cambiar), en una zona o en el suelo libre para elegir su acabado.
          También puedes hacer clic en una pared en la vista 3D.
        </p>
      )}
    </section>
  );
}

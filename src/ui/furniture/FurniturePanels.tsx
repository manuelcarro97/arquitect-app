import { useState } from 'react';
import { furnitureOutsideIds, type Furniture } from '../../domain';
import { useProjectStore } from '../../store/projectStore';
import { useActiveFloor } from '../../store/selectors';
import { NumberCell } from '../components/NumberCell';
import { CATALOG, CATALOG_CATEGORIES, catalogItem, type CatalogCategory } from './catalog';
import { MODEL_CATALOG } from './modelCatalog';

function Measure({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  return (
    <label className="field">
      {label}
      <NumberCell key={`${label}-${value}`} value={value} autoFocus={false} ariaLabel={label} onCommit={onCommit} />
    </label>
  );
}

/** Side panel section for the selected piece. Renders nothing when no piece is selected. */
export function FurnitureDetails() {
  const floor = useActiveFloor();
  const selection = useProjectStore((state) => state.selection);
  const updateFurniture = useProjectStore((state) => state.updateFurniture);
  const removeFurniture = useProjectStore((state) => state.removeFurniture);
  const duplicateFurniture = useProjectStore((state) => state.duplicateFurniture);

  const piece = selection?.kind === 'furniture' ? floor.furniture.find((item) => item.id === selection.id) : undefined;
  if (!piece) return null;

  const info = catalogItem(piece.catalogId);
  const outside = furnitureOutsideIds(floor).includes(piece.id);
  const update = (changes: Partial<Furniture>) => updateFurniture(piece.id, changes);
  const resized = piece.width !== info.width || piece.depth !== info.depth || piece.height !== info.height;

  return (
    <section className="panel panel--details">
      <h2 className="panel__title">🪑 {info.name}</h2>
      {outside && <p className="status status--warn">Se sale del piso: muévelo hacia dentro.</p>}
      {info.model ? (
        <>
          <div className="details__meta">
            Modelo 3D · {piece.width} × {piece.depth} × {piece.height} cm (medidas fijas del modelo)
          </div>
          <div className="field-grid">
            <Measure label="Giro (°)" value={piece.rotation} onCommit={(rotation) => update({ rotation })} />
          </div>
        </>
      ) : (
        <div className="field-grid">
          <Measure label="Ancho (cm)" value={piece.width} onCommit={(width) => update({ width })} />
          <Measure label="Fondo (cm)" value={piece.depth} onCommit={(depth) => update({ depth })} />
          <Measure label="Alto (cm)" value={piece.height} onCommit={(height) => update({ height })} />
          <Measure label="Giro (°)" value={piece.rotation} onCommit={(rotation) => update({ rotation })} />
        </div>
      )}
      <div className="button-row">
        <button onClick={() => update({ rotation: piece.rotation + 90 })} title="Girar 90° (tecla R)">
          ↻ Girar 90°
        </button>
        <button onClick={() => duplicateFurniture(piece.id)}>Duplicar</button>
        {resized && !info.model && (
          <button onClick={() => update({ width: info.width, depth: info.depth, height: info.height })}>Medidas originales</button>
        )}
        <button className="danger-link" onClick={() => removeFurniture(piece.id)}>
          Borrar
        </button>
      </div>
      <p className="panel__help">Arrástralo en el plano: se pega a las paredes (Shift para moverlo libre). R gira 90°, Shift+R 15°.</p>
    </section>
  );
}

/** Catalog grouped by room; clicking a piece starts placing it on the plan. */
export function FurnitureCatalog() {
  const placing = useProjectStore((state) => state.placingFurniture);
  const startPlacingFurniture = useProjectStore((state) => state.startPlacingFurniture);
  const stopPlacingFurniture = useProjectStore((state) => state.stopPlacingFurniture);
  const [category, setCategory] = useState<CatalogCategory>('Salón');
  const [kind, setKind] = useState<'boxes' | 'models'>('boxes');
  const items = (kind === 'boxes' ? CATALOG : MODEL_CATALOG).filter((item) => item.category === category);

  return (
    <section className="details">
      <h3 className="details__title">Muebles</h3>
      <div className="segmented segmented--full" role="group" aria-label="Tipo de mueble">
        <button className={kind === 'boxes' ? 'is-active' : ''} onClick={() => setKind('boxes')} title="Cajas con medidas editables">
          Editables
        </button>
        <button className={kind === 'models' ? 'is-active' : ''} onClick={() => setKind('models')} title="Modelos realistas, medidas fijas">
          Modelos 3D
        </button>
      </div>
      <p className="panel__help">
        {kind === 'boxes'
          ? 'Cajas simples: puedes cambiar ancho, fondo y alto para comprobar si algo cabe.'
          : 'Modelos realistas con medidas fijas, para hacerte una idea de cómo queda.'}
      </p>
      <div className="chip-row" role="tablist" aria-label="Categorías de muebles">
        {CATALOG_CATEGORIES.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={category === name}
            className={`chip ${category === name ? 'is-active' : ''}`}
            onClick={() => setCategory(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <ul className="catalog-list">
        {items.length === 0 && <li className="panel__help">No hay modelos de esta categoría.</li>}
        {items.map((item) => (
          <li key={item.id}>
            <button
              className={`catalog-item ${placing?.catalogId === item.id ? 'is-active' : ''}`}
              onClick={() =>
                placing?.catalogId === item.id
                  ? stopPlacingFurniture()
                  : startPlacingFurniture({ catalogId: item.id, width: item.width, depth: item.depth, height: item.height })
              }
              title="Clic y luego clic en el plano para colocarlo"
            >
              <span className="catalog-item__swatch" style={{ background: item.color }} />
              <span className="catalog-item__name">{item.name}</span>
              <span className="catalog-item__size">
                {item.width}×{item.depth}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Side panel of Amueblar mode: catalog and the pieces already placed. */
export function FurnishPanel() {
  const floor = useActiveFloor();
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);
  const outside = new Set(furnitureOutsideIds(floor));

  return (
    <section className="panel">
      <h2 className="panel__title">Amueblar</h2>
      <p className="panel__help">Paredes, tabiques y huecos están bloqueados en este modo: solo se mueven muebles.</p>
      <FurnitureCatalog />
      <section className="details">
        <h3 className="details__title">En el plano ({floor.furniture.length})</h3>
        {floor.furniture.length === 0 ? (
          <p className="panel__help">Todavía no hay muebles.</p>
        ) : (
          <ul className="catalog-list">
            {floor.furniture.map((item) => {
              const info = catalogItem(item.catalogId);
              const selected = selection?.kind === 'furniture' && selection.id === item.id;
              return (
                <li key={item.id}>
                  <button
                    className={`catalog-item ${selected ? 'is-active' : ''}`}
                    onClick={() => select({ kind: 'furniture', id: item.id })}
                  >
                    <span className="catalog-item__swatch" style={{ background: info.color }} />
                    <span className="catalog-item__name">
                      {info.name}
                      {outside.has(item.id) ? ' ⚠' : ''}
                    </span>
                    <span className="catalog-item__size">
                      {item.width}×{item.depth}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}

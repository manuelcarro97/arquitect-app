import { useProjectStore } from '../../store/projectStore';
import { LAYER_EDITED_BY_MODE, useViewStore, type LayerName, type ViewName } from '../../store/viewStore';

const LAYERS: { name: LayerName; label: string }[] = [
  { name: 'zones', label: 'Zonas' },
  { name: 'furniture', label: 'Muebles' },
  { name: 'finishes', label: 'Acabados' },
];

/** Buttons to show or hide zones, furniture and finishes in one view. */
export function LayerToggles({ view }: { view: ViewName }) {
  const mode = useProjectStore((state) => state.mode);
  const layers = useViewStore((state) => state.layers[view]);
  const toggleLayer = useViewStore((state) => state.toggleLayer);
  const forced = LAYER_EDITED_BY_MODE[mode];

  return (
    <div className="layer-toggles" role="group" aria-label="Capas visibles">
      {LAYERS.map((layer) => {
        const locked = layer.name === forced;
        const visible = locked || layers[layer.name];
        return (
          <button
            key={layer.name}
            className={visible ? 'is-active' : ''}
            aria-pressed={visible}
            disabled={locked}
            title={locked ? 'Siempre visible en este modo' : visible ? `Ocultar ${layer.label.toLowerCase()}` : `Mostrar ${layer.label.toLowerCase()}`}
            onClick={() => toggleLayer(view, layer.name)}
          >
            {visible ? '👁' : '—'} {layer.label}
          </button>
        );
      })}
    </div>
  );
}

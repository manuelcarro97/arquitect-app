import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { EditorMode } from './projectStore';

export type LayerName = 'zones' | 'furniture' | 'finishes';
export type ViewName = 'plan' | 'viewer3d';
export type LayerVisibility = Record<LayerName, boolean>;

const ALL_VISIBLE: LayerVisibility = { zones: true, furniture: true, finishes: true };

/** Layer each mode edits: it stays visible there even if hidden in the toggles. */
export const LAYER_EDITED_BY_MODE: Partial<Record<EditorMode, LayerName>> = {
  layout: 'zones',
  furnish: 'furniture',
  finishes: 'finishes',
};

interface ViewState {
  layers: Record<ViewName, LayerVisibility>;
  toggleLayer: (view: ViewName, layer: LayerName) => void;
}

/**
 * What each view shows. Display preferences only: not part of the project or of undo,
 * remembered per browser in localStorage.
 */
export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      layers: { plan: ALL_VISIBLE, viewer3d: ALL_VISIBLE },
      toggleLayer: (view, layer) =>
        set((state) => ({
          layers: { ...state.layers, [view]: { ...state.layers[view], [layer]: !state.layers[view][layer] } },
        })),
    }),
    { name: 'arquitect-app:layers', storage: createJSONStorage(() => localStorage) },
  ),
);

/** Visibility of a view's layers in the current mode (the edited layer is always shown). */
export function useVisibleLayers(view: ViewName, mode: EditorMode): LayerVisibility {
  const layers = useViewStore((state) => state.layers[view]);
  const forced = LAYER_EDITED_BY_MODE[mode];
  return forced ? { ...layers, [forced]: true } : layers;
}

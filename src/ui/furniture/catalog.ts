import { MODEL_CATALOG } from './modelCatalog';

/** A piece of furniture that can be placed, with typical Spanish sizes in cm. */
export interface CatalogItem {
  id: string;
  name: string;
  category: CatalogCategory;
  width: number;
  depth: number;
  height: number;
  /** Colour of its box in 2D and 3D (for models, only the plan colour). */
  color: string;
  /** Realistic 3D model with a fixed size: file name in public/models and footprint centre in model units. */
  model?: { file: string; center: [number, number, number] };
}

export type CatalogCategory = 'Salón' | 'Comedor' | 'Dormitorio' | 'Cocina' | 'Baño' | 'Otros';

export const CATALOG_CATEGORIES: CatalogCategory[] = ['Salón', 'Comedor', 'Dormitorio', 'Cocina', 'Baño', 'Otros'];

const WOOD = '#c9a77c';
const FABRIC = '#9fb4c7';
const WHITE = '#e9e6df';
const STEEL = '#b9bec4';
const CERAMIC = '#f4f4f2';

export const CATALOG: CatalogItem[] = [
  { id: 'sofa-3', name: 'Sofá 3 plazas', category: 'Salón', width: 210, depth: 90, height: 85, color: FABRIC },
  { id: 'sofa-2', name: 'Sofá 2 plazas', category: 'Salón', width: 160, depth: 90, height: 85, color: FABRIC },
  { id: 'sofa-chaise', name: 'Sofá chaise longue', category: 'Salón', width: 270, depth: 160, height: 85, color: FABRIC },
  { id: 'armchair', name: 'Sillón', category: 'Salón', width: 80, depth: 85, height: 90, color: FABRIC },
  { id: 'coffee-table', name: 'Mesa de centro', category: 'Salón', width: 110, depth: 60, height: 45, color: WOOD },
  { id: 'tv-unit', name: 'Mueble TV', category: 'Salón', width: 180, depth: 40, height: 50, color: WOOD },
  { id: 'bookcase', name: 'Estantería', category: 'Salón', width: 80, depth: 30, height: 180, color: WOOD },

  { id: 'dining-table-6', name: 'Mesa comedor 6 pers.', category: 'Comedor', width: 160, depth: 90, height: 75, color: WOOD },
  { id: 'dining-table-4', name: 'Mesa comedor 4 pers.', category: 'Comedor', width: 120, depth: 80, height: 75, color: WOOD },
  { id: 'chair', name: 'Silla', category: 'Comedor', width: 45, depth: 50, height: 90, color: WOOD },
  { id: 'sideboard', name: 'Aparador', category: 'Comedor', width: 160, depth: 45, height: 80, color: WOOD },

  { id: 'bed-150', name: 'Cama 150×190', category: 'Dormitorio', width: 160, depth: 205, height: 55, color: WHITE },
  { id: 'bed-135', name: 'Cama 135×190', category: 'Dormitorio', width: 145, depth: 205, height: 55, color: WHITE },
  { id: 'bed-90', name: 'Cama 90×190', category: 'Dormitorio', width: 100, depth: 205, height: 55, color: WHITE },
  { id: 'nightstand', name: 'Mesita de noche', category: 'Dormitorio', width: 45, depth: 40, height: 55, color: WOOD },
  { id: 'wardrobe-200', name: 'Armario 200 cm', category: 'Dormitorio', width: 200, depth: 60, height: 240, color: WOOD },
  { id: 'wardrobe-100', name: 'Armario 100 cm', category: 'Dormitorio', width: 100, depth: 60, height: 240, color: WOOD },
  { id: 'dresser', name: 'Cómoda', category: 'Dormitorio', width: 100, depth: 45, height: 80, color: WOOD },

  { id: 'base-cabinet', name: 'Módulo bajo 60', category: 'Cocina', width: 60, depth: 60, height: 90, color: WHITE },
  { id: 'counter-240', name: 'Encimera 240', category: 'Cocina', width: 240, depth: 60, height: 90, color: WHITE },
  { id: 'fridge', name: 'Frigorífico', category: 'Cocina', width: 60, depth: 65, height: 185, color: STEEL },
  { id: 'oven-column', name: 'Columna horno', category: 'Cocina', width: 60, depth: 60, height: 210, color: WHITE },
  { id: 'island', name: 'Isla de cocina', category: 'Cocina', width: 180, depth: 90, height: 90, color: WHITE },
  { id: 'dishwasher', name: 'Lavavajillas', category: 'Cocina', width: 60, depth: 60, height: 85, color: STEEL },

  { id: 'toilet', name: 'Inodoro', category: 'Baño', width: 38, depth: 70, height: 80, color: CERAMIC },
  { id: 'washbasin', name: 'Lavabo con mueble', category: 'Baño', width: 80, depth: 46, height: 85, color: CERAMIC },
  { id: 'shower-tray', name: 'Plato de ducha 80×120', category: 'Baño', width: 120, depth: 80, height: 5, color: CERAMIC },
  { id: 'shower-tray-small', name: 'Plato de ducha 80×80', category: 'Baño', width: 80, depth: 80, height: 5, color: CERAMIC },
  { id: 'bathtub', name: 'Bañera', category: 'Baño', width: 170, depth: 70, height: 55, color: CERAMIC },
  { id: 'bidet', name: 'Bidé', category: 'Baño', width: 36, depth: 55, height: 40, color: CERAMIC },

  { id: 'desk', name: 'Escritorio', category: 'Otros', width: 120, depth: 60, height: 75, color: WOOD },
  { id: 'office-chair', name: 'Silla de oficina', category: 'Otros', width: 60, depth: 60, height: 100, color: '#5f6b75' },
  { id: 'washing-machine', name: 'Lavadora', category: 'Otros', width: 60, depth: 60, height: 85, color: WHITE },
  { id: 'shoe-cabinet', name: 'Zapatero', category: 'Otros', width: 80, depth: 30, height: 100, color: WOOD },
];

const FALLBACK: CatalogItem = { id: 'custom', name: 'Mueble', category: 'Otros', width: 60, depth: 60, height: 80, color: '#c8c3b8' };

export function catalogItem(id: string): CatalogItem {
  return CATALOG.find((item) => item.id === id) ?? MODEL_CATALOG.find((item) => item.id === id) ?? FALLBACK;
}

export const CUSTOM_CATALOG_ID = 'custom';

/** Name shown for a placed piece: its own name (custom pieces) or the catalog name. */
export function pieceName(piece: { catalogId: string; name?: string }): string {
  return piece.name ?? catalogItem(piece.catalogId).name;
}

/** Colour of a placed piece: its own colour or the catalog colour. */
export function pieceColor(piece: { catalogId: string; color?: string }): string {
  return piece.color ?? catalogItem(piece.catalogId).color;
}

import type { MaterialId } from '../../domain';

export type MaterialTarget = 'wall' | 'floor';

/** How the texture of a material is drawn (sizes in cm, real scale). */
export type Pattern =
  | { type: 'plain' }
  | { type: 'planks'; plankWidth: number; plankLength: number; joint: string }
  | { type: 'tiles'; tileWidth: number; tileHeight: number; grout: string; staggered?: boolean; alternate?: string }
  | { type: 'speckle'; speckle: string; density: number }
  | { type: 'marble'; vein: string };

export interface MaterialInfo {
  id: MaterialId;
  name: string;
  targets: MaterialTarget[];
  /** Base colour: used as is in 2D and as the texture background in 3D. */
  color: string;
  pattern: Pattern;
  roughness: number;
}

const PAINT_PREFIX = 'paint:';

export const PAINT_COLORS: { name: string; color: string }[] = [
  { name: 'Blanco', color: '#f5f3ee' },
  { name: 'Blanco roto', color: '#ece6da' },
  { name: 'Gris perla', color: '#d8d6d0' },
  { name: 'Gris medio', color: '#a9a8a3' },
  { name: 'Antracita', color: '#4a4a48' },
  { name: 'Beige', color: '#e3d5bd' },
  { name: 'Arena', color: '#d7c3a0' },
  { name: 'Verde salvia', color: '#b7c4a8' },
  { name: 'Azul claro', color: '#b9cbd8' },
  { name: 'Azul noche', color: '#3f5468' },
  { name: 'Terracota', color: '#c77b58' },
  { name: 'Amarillo suave', color: '#efe0a8' },
  { name: 'Rosa palo', color: '#e8c9c1' },
];

/** Paints are stored as "paint:#rrggbb", so any colour can be used. */
export function paintId(color: string): MaterialId {
  return `${PAINT_PREFIX}${color.toLowerCase()}`;
}

export const MATERIALS: MaterialInfo[] = [
  // Wall coverings
  { id: 'tile-white', name: 'Azulejo blanco 20×20', targets: ['wall'], color: '#f2f2ef', pattern: { type: 'tiles', tileWidth: 20, tileHeight: 20, grout: '#cfcfca' }, roughness: 0.3 },
  { id: 'tile-metro', name: 'Azulejo metro 10×20', targets: ['wall'], color: '#f4f3ef', pattern: { type: 'tiles', tileWidth: 20, tileHeight: 10, grout: '#c9c8c2', staggered: true }, roughness: 0.25 },
  { id: 'tile-gray-large', name: 'Porcelánico gris 30×60', targets: ['wall', 'floor'], color: '#b9b7b1', pattern: { type: 'tiles', tileWidth: 60, tileHeight: 30, grout: '#9d9b95' }, roughness: 0.4 },
  { id: 'stone-wall', name: 'Piedra', targets: ['wall'], color: '#b8ad9c', pattern: { type: 'speckle', speckle: '#8f8574', density: 0.35 }, roughness: 0.95 },
  { id: 'wood-panel', name: 'Friso de madera', targets: ['wall'], color: '#c29a6b', pattern: { type: 'planks', plankWidth: 12, plankLength: 250, joint: '#9c7550' }, roughness: 0.7 },
  // Floors
  { id: 'parquet-oak', name: 'Parquet roble', targets: ['floor'], color: '#c9a77c', pattern: { type: 'planks', plankWidth: 15, plankLength: 120, joint: '#a88560' }, roughness: 0.6 },
  { id: 'parquet-walnut', name: 'Parquet nogal', targets: ['floor'], color: '#7a5236', pattern: { type: 'planks', plankWidth: 15, plankLength: 120, joint: '#5c3c26' }, roughness: 0.6 },
  { id: 'gres-gray', name: 'Gres gris 60×60', targets: ['floor'], color: '#b5b2ab', pattern: { type: 'tiles', tileWidth: 60, tileHeight: 60, grout: '#98958e' }, roughness: 0.5 },
  { id: 'gres-beige', name: 'Gres beige 45×45', targets: ['floor'], color: '#d8c8ab', pattern: { type: 'tiles', tileWidth: 45, tileHeight: 45, grout: '#bba98a' }, roughness: 0.5 },
  { id: 'hydraulic', name: 'Baldosa hidráulica 20×20', targets: ['floor'], color: '#d9d2c3', pattern: { type: 'tiles', tileWidth: 20, tileHeight: 20, grout: '#b6ae9e', alternate: '#5f7f8a' }, roughness: 0.5 },
  { id: 'marble', name: 'Mármol blanco', targets: ['floor', 'wall'], color: '#eceae6', pattern: { type: 'marble', vein: '#b9b5ad' }, roughness: 0.2 },
  { id: 'concrete', name: 'Microcemento', targets: ['floor', 'wall'], color: '#a8a6a0', pattern: { type: 'speckle', speckle: '#94928c', density: 0.2 }, roughness: 0.8 },
  { id: 'carpet', name: 'Moqueta', targets: ['floor'], color: '#8d8a80', pattern: { type: 'speckle', speckle: '#7b786f', density: 0.6 }, roughness: 1 },
];

export function materialInfo(id: MaterialId | undefined): MaterialInfo | null {
  if (!id) return null;
  if (id.startsWith(PAINT_PREFIX)) {
    const color = id.slice(PAINT_PREFIX.length);
    const named = PAINT_COLORS.find((paint) => paint.color === color);
    return { id, name: named ? `Pintura ${named.name.toLowerCase()}` : `Pintura ${color}`, targets: ['wall'], color, pattern: { type: 'plain' }, roughness: 0.9 };
  }
  return MATERIALS.find((material) => material.id === id) ?? null;
}

export function materialsFor(target: MaterialTarget): MaterialInfo[] {
  return MATERIALS.filter((material) => material.targets.includes(target));
}

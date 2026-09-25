import type { OpeningType } from '../../domain';

export interface OpeningPreset {
  id: string;
  label: string;
  type: OpeningType;
  width: number;
  height: number;
  sillHeight: number;
}

/** Common Spanish sizes (cm). Doors are leaf widths; "balconera" is a full-height window. */
export const OPENING_PRESETS: OpeningPreset[] = [
  { id: 'door-62', label: 'Puerta 62 cm (baño)', type: 'door', width: 62, height: 203, sillHeight: 0 },
  { id: 'door-72', label: 'Puerta 72 cm', type: 'door', width: 72, height: 203, sillHeight: 0 },
  { id: 'door-82', label: 'Puerta 82 cm', type: 'door', width: 82, height: 203, sillHeight: 0 },
  { id: 'door-92', label: 'Puerta 92 cm (entrada)', type: 'door', width: 92, height: 210, sillHeight: 0 },
  { id: 'door-145', label: 'Puerta doble 145 cm', type: 'door', width: 145, height: 210, sillHeight: 0 },
  { id: 'window-60', label: 'Ventana 60×60 (baño)', type: 'window', width: 60, height: 60, sillHeight: 150 },
  { id: 'window-100', label: 'Ventana 100×120', type: 'window', width: 100, height: 120, sillHeight: 100 },
  { id: 'window-120', label: 'Ventana 120×120', type: 'window', width: 120, height: 120, sillHeight: 100 },
  { id: 'window-180', label: 'Ventana 180×120', type: 'window', width: 180, height: 120, sillHeight: 100 },
  { id: 'balcony-80', label: 'Balconera 80×210', type: 'window', width: 80, height: 210, sillHeight: 0 },
  { id: 'balcony-160', label: 'Balconera 160×210', type: 'window', width: 160, height: 210, sillHeight: 0 },
];

export const DEFAULT_PRESET_ID: Record<OpeningType, string> = { door: 'door-82', window: 'window-120' };

export function presetsOf(type: OpeningType): OpeningPreset[] {
  return OPENING_PRESETS.filter((preset) => preset.type === type);
}

export function findPreset(id: string): OpeningPreset | undefined {
  return OPENING_PRESETS.find((preset) => preset.id === id);
}

/** Canvas colours (Konva draws on <canvas>, which cannot read CSS variables). */
export const CANVAS_COLORS = {
  background: '#f7f6f2',
  gridMinor: '#e7e4dc',
  gridMajor: '#d3cec2',
  wall: '#3d3a35',
  wallSelected: '#d9622b',
  wallHover: '#6b665d',
  corner: '#3d3a35',
  start: '#2a7f62',
  label: '#3d3a35',
  labelSelected: '#d9622b',
  gap: '#c8372d',
  preview: '#2f6fb5',
  guide: '#c2379b',
  wallLocked: '#9c978d',
  partition: '#55504a',
  invalid: '#c8372d',
  handle: '#ffffff',
} as const;

/** Colours offered to new zones, in order. */
export const ZONE_PALETTE = ['#e9c46a', '#8ab17d', '#7fb2d6', '#e76f51', '#b392ac', '#f4a261', '#90be6d', '#c9ada7'];

const numberFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
const areaFormat = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatCm(value: number): string {
  return `${numberFormat.format(value)} cm`;
}

export function formatDegrees(value: number): string {
  return `${numberFormat.format(value)}°`;
}

export function formatM2(value: number): string {
  return `${areaFormat.format(value)} m²`;
}

/** Rounds to one decimal to hide floating point noise in inputs. */
export function roundForInput(value: number): number {
  return Math.round(value * 10) / 10;
}

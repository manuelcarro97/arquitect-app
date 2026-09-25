import type { Point } from '../../domain';

/** Wall angle turned into a text rotation in [-90, 90) so labels never read upside down. */
export function readableRotation(angle: number): number {
  if (angle >= 90 && angle < 270) return angle - 180;
  if (angle >= 270) return angle - 360;
  return angle;
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Average of the vertices: good enough to place a zone's label. */
export function vertexCentroid(points: Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/** Sets the canvas cursor from a Konva event target. */
export function setStageCursor(target: { getStage: () => { container: () => HTMLDivElement } | null }, cursor: string) {
  const container = target.getStage()?.container();
  if (container) container.style.cursor = cursor;
}

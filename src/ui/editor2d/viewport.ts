import type { Point } from '../../domain';

/** Stage transform: screen = world * scale + (x, y). World units are cm. */
export interface Viewport {
  scale: number;
  x: number;
  y: number;
}

export const MIN_SCALE = 0.03;
export const MAX_SCALE = 8;
const FIT_MARGIN_PX = 80;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Zooms keeping the world point under `screenPoint` fixed. */
export function zoomAt(viewport: Viewport, screenPoint: Point, factor: number): Viewport {
  const scale = clampScale(viewport.scale * factor);
  const worldX = (screenPoint.x - viewport.x) / viewport.scale;
  const worldY = (screenPoint.y - viewport.y) / viewport.scale;
  return { scale, x: screenPoint.x - worldX * scale, y: screenPoint.y - worldY * scale };
}

/** Viewport that shows all points centred; with no content, puts the origin near the top-left. */
export function fitPoints(points: Point[], width: number, height: number): Viewport {
  if (points.length < 2) {
    return { scale: 1, x: width * 0.25, y: height * 0.25 };
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const contentWidth = Math.max(maxX - minX, 100);
  const contentHeight = Math.max(maxY - minY, 100);
  const scale = clampScale(
    Math.min((width - FIT_MARGIN_PX * 2) / contentWidth, (height - FIT_MARGIN_PX * 2) / contentHeight),
  );
  return {
    scale,
    x: width / 2 - ((minX + maxX) / 2) * scale,
    y: height / 2 - ((minY + maxY) / 2) * scale,
  };
}

export function visibleWorldRect(viewport: Viewport, width: number, height: number) {
  return {
    left: -viewport.x / viewport.scale,
    top: -viewport.y / viewport.scale,
    right: (width - viewport.x) / viewport.scale,
    bottom: (height - viewport.y) / viewport.scale,
  };
}

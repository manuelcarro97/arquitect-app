import type { Point } from '../../domain';
import { clampScale, type Viewport } from './viewport';

const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const gap = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Two-finger gesture on the plan: moving both fingers pans, spreading or pinching them zooms.
 * The plan point that was under the middle of the fingers when they touched stays under it.
 * `from` are the finger positions (screen px) when the gesture started, `to` the current ones.
 */
export function pinchViewport(start: Viewport, from: [Point, Point], to: [Point, Point]): Viewport {
  const startGap = gap(from[0], from[1]);
  const factor = startGap > 0 ? gap(to[0], to[1]) / startGap : 1;
  const scale = clampScale(start.scale * factor);
  const startMid = midpoint(from[0], from[1]);
  const world = { x: (startMid.x - start.x) / start.scale, y: (startMid.y - start.y) / start.scale };
  const mid = midpoint(to[0], to[1]);
  return { scale, x: mid.x - world.x * scale, y: mid.y - world.y * scale };
}

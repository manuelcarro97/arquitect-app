import type { Point } from '../../domain';

/** Plan units are cm; the 3D scene uses metres. */
export const CM_TO_M = 0.01;

/** Plan (x, y) in cm → scene [x, height, z] in metres. The plan's y axis becomes the scene's z axis. */
export function toScene(point: Point, heightCm = 0): [number, number, number] {
  return [point.x * CM_TO_M, heightCm * CM_TO_M, point.y * CM_TO_M];
}

/** Plan angles turn clockwise on screen (y down); scene rotations around Y turn the other way. */
export function planAngleToRotationY(angleDegrees: number): number {
  return (-angleDegrees * Math.PI) / 180;
}

export interface SceneBounds {
  center: [number, number, number];
  size: number;
}

/** Centre and largest horizontal extent (metres) of the given plan points, or null without content. */
export function sceneBounds(points: Point[]): SceneBounds | null {
  if (points.length < 2) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    center: toScene({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 }),
    size: Math.max(maxX - minX, maxY - minY, 100) * CM_TO_M,
  };
}

export const SCENE_COLORS = {
  background: '#eceae4',
  wall: '#f4f1ea',
  wallSelected: '#e8a27f',
  wallEdge: '#8d877c',
  floor: '#d8c7a8',
  ground: '#e2dfd7',
} as const;

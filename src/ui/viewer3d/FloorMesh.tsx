import { useMemo } from 'react';
import { Shape } from 'three';
import type { MaterialId, Point } from '../../domain';
import { CM_TO_M, SCENE_COLORS } from './scene';
import { SurfaceMaterial } from './SurfaceMaterial';

/** Flat floor filling the closed perimeter polygon, with the general floor finish if any. */
export function FloorMesh({ polygon, finish }: { polygon: Point[]; finish?: MaterialId }) {
  const shape = useMemo(() => {
    // Built in the XY plane with y negated, then laid flat by rotating -90° around X (so plan y → scene z).
    const floorShape = new Shape();
    polygon.forEach((point, i) => {
      const x = point.x * CM_TO_M;
      const y = -point.y * CM_TO_M;
      if (i === 0) floorShape.moveTo(x, y);
      else floorShape.lineTo(x, y);
    });
    floorShape.closePath();
    return floorShape;
  }, [polygon]);

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.001} receiveShadow>
      <shapeGeometry args={[shape]} />
      {/* Polygon offset keeps the floor drawn in front of the ground plane (avoids flickering). */}
      <SurfaceMaterial materialId={finish} fallback={SCENE_COLORS.floor} polygonOffsetFactor={-1} />
    </mesh>
  );
}

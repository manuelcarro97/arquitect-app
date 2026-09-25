import { useMemo } from 'react';
import { Shape } from 'three';
import type { Zone } from '../../domain';
import { CM_TO_M } from './scene';
import { SurfaceMaterial } from './SurfaceMaterial';

function zoneShape(zone: Zone): Shape {
  // Same convention as the main floor: XY plane with y negated, laid flat by the mesh rotation.
  const shape = new Shape();
  zone.points.forEach((point, i) => {
    if (i === 0) shape.moveTo(point.x * CM_TO_M, -point.y * CM_TO_M);
    else shape.lineTo(point.x * CM_TO_M, -point.y * CM_TO_M);
  });
  shape.closePath();
  return shape;
}

/** Tints the floor of each zone with its colour. */
export function ZoneFloors({ zones }: { zones: Zone[] }) {
  const shapes = useMemo(() => zones.map((zone) => ({ zone, shape: zoneShape(zone) })), [zones]);
  return (
    <>
      {shapes.map(({ zone, shape }) => (
        <mesh key={zone.id} rotation-x={-Math.PI / 2} position-y={0.002} receiveShadow>
          <shapeGeometry args={[shape]} />
          {zone.floorFinish ? (
            <SurfaceMaterial materialId={zone.floorFinish} fallback={zone.color} polygonOffsetFactor={-2} />
          ) : (
            <meshStandardMaterial
              color={zone.color}
              roughness={0.85}
              transparent
              opacity={0.7}
              polygonOffset
              polygonOffsetFactor={-2}
              polygonOffsetUnits={-2}
            />
          )}
        </mesh>
      ))}
    </>
  );
}

import { useEffect, useMemo } from 'react';
import type { MaterialId } from '../../domain';
import { materialInfo } from '../materials/materials';
import { textureForMetreUVs, textureForSurface } from './materialTextures';

interface SurfaceMaterialProps {
  /** R3F attach target, e.g. "material-4" for one face of a box. */
  attach?: string;
  materialId: MaterialId | undefined;
  /** Colour when there is no finish. */
  fallback: string;
  /** Size of the surface (cm) for boxes with 0..1 UVs; omit for flat shapes whose UVs are in metres. */
  sizeCm?: { width: number; height: number };
  polygonOffsetFactor?: number;
}

/** Standard material showing a finish (colour or real-scale texture) on one surface. */
export function SurfaceMaterial({ attach, materialId, fallback, sizeCm, polygonOffsetFactor }: SurfaceMaterialProps) {
  const width = sizeCm?.width;
  const height = sizeCm?.height;
  const map = useMemo(() => {
    const info = materialInfo(materialId);
    if (!info) return null;
    return width !== undefined && height !== undefined ? textureForSurface(info, width, height) : textureForMetreUVs(info);
  }, [materialId, width, height]);
  // Each surface owns its texture copy: free it when the surface or its finish changes.
  useEffect(() => () => map?.dispose(), [map]);

  const info = materialInfo(materialId);
  return (
    <meshStandardMaterial
      // Three only compiles the texture shader when the material is created: rebuild it when a map appears or goes.
      key={map ? 'textured' : 'plain'}
      attach={attach}
      color={map ? '#ffffff' : (info?.color ?? fallback)}
      map={map}
      roughness={info?.roughness ?? 0.9}
      polygonOffset={polygonOffsetFactor !== undefined}
      polygonOffsetFactor={polygonOffsetFactor ?? 0}
      polygonOffsetUnits={polygonOffsetFactor ?? 0}
    />
  );
}

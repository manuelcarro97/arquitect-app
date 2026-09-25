import { Edges } from '@react-three/drei';
import type { Furniture } from '../../domain';
import { catalogItem } from '../furniture/catalog';
import { CM_TO_M, planAngleToRotationY, toScene } from './scene';

/**
 * Furniture as boxes of their real size and catalog colour.
 * Later a .glb model per catalog id can replace the box without touching the rest.
 */
export function FurnitureMeshes({ furniture, selectedId }: { furniture: Furniture[]; selectedId: string | null }) {
  return (
    <>
      {furniture.map((item) => (
        <mesh
          key={item.id}
          position={toScene({ x: item.x, y: item.y }, item.height / 2)}
          rotation-y={planAngleToRotationY(item.rotation)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[item.width * CM_TO_M, item.height * CM_TO_M, item.depth * CM_TO_M]} />
          <meshStandardMaterial color={catalogItem(item.catalogId).color} roughness={0.8} />
          <Edges color={item.id === selectedId ? '#d9622b' : '#6b665d'} />
        </mesh>
      ))}
    </>
  );
}

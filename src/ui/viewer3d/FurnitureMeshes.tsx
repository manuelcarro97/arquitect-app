import { Edges, useGLTF } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import type { Mesh } from 'three';
import type { Furniture } from '../../domain';
import { catalogItem, pieceColor } from '../furniture/catalog';
import { MODEL_SCALE, MODELS_BASE_URL } from '../furniture/modelCatalog';
import { CM_TO_M, planAngleToRotationY, toScene } from './scene';

const SELECTED_EDGE = '#d9622b';
const EDGE = '#6b665d';

/** Editable piece: a box of its real size and colour. */
function BoxPiece({ item, selected }: { item: Furniture; selected: boolean }) {
  return (
    <mesh position={[0, (item.height * CM_TO_M) / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[item.width * CM_TO_M, item.height * CM_TO_M, item.depth * CM_TO_M]} />
      <meshStandardMaterial color={pieceColor(item)} roughness={0.8} />
      <Edges color={selected ? SELECTED_EDGE : EDGE} />
    </mesh>
  );
}

/** Invisible box with orange edges around a model, to show it is selected. */
function SelectionOutline({ item }: { item: Furniture }) {
  return (
    <mesh position={[0, (item.height * CM_TO_M) / 2, 0]}>
      <boxGeometry args={[item.width * CM_TO_M, item.height * CM_TO_M, item.depth * CM_TO_M]} />
      <meshBasicMaterial visible={false} />
      <Edges color={SELECTED_EDGE} />
    </mesh>
  );
}

/** Realistic piece: the .glb model, scaled to metres and centred on the piece position. */
function ModelPiece({ file, center }: { file: string; center: [number, number, number] }) {
  const { scene } = useGLTF(`${MODELS_BASE_URL}${file}.glb`);
  // The loaded scene is shared (cached); each placed piece needs its own copy.
  const copy = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((node) => {
      if ((node as Mesh).isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  return (
    <group scale={MODEL_SCALE} position={center.map((value) => -value * MODEL_SCALE) as [number, number, number]}>
      <primitive object={copy} />
    </group>
  );
}

/**
 * Furniture in 3D. Plan front (+y) is scene +z, which is also where the models face.
 * Model pieces show a box while their file loads.
 */
export function FurnitureMeshes({ furniture, selectedId }: { furniture: Furniture[]; selectedId: string | null }) {
  return (
    <>
      {furniture.map((item) => {
        const model = catalogItem(item.catalogId).model;
        const selected = item.id === selectedId;
        return (
          <group key={item.id} position={toScene({ x: item.x, y: item.y })} rotation-y={planAngleToRotationY(item.rotation)}>
            {model ? (
              <>
                <Suspense fallback={<BoxPiece item={item} selected={selected} />}>
                  <ModelPiece file={model.file} center={model.center} />
                </Suspense>
                {selected && <SelectionOutline item={item} />}
              </>
            ) : (
              <BoxPiece item={item} selected={selected} />
            )}
          </group>
        );
      })}
    </>
  );
}

import { Edges, useGLTF } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useMemo, useState } from 'react';
import { Plane, Vector3, type Mesh, type Ray } from 'three';
import { snapFurnitureToWalls, type Furniture, type Point, type WallGeometry } from '../../domain';
import { useProjectStore } from '../../store/projectStore';
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

interface Drag {
  id: string;
  /** Piece centre minus the floor point grabbed, so the piece does not jump under the cursor. */
  grab: Point;
  x: number;
  y: number;
  moved: boolean;
}

/** Wall snapping distance while dragging in 3D (cm). */
const SNAP_CM = 15;
const FLOOR = new Plane(new Vector3(0, 1, 0), 0);

/** Where a pointer ray hits the floor, in plan coordinates (cm). */
function floorPoint(ray: Ray): Point | null {
  const hit = new Vector3();
  return ray.intersectPlane(FLOOR, hit) ? { x: hit.x / CM_TO_M, y: hit.z / CM_TO_M } : null;
}

interface FurnitureMeshesProps {
  furniture: Furniture[];
  selectedId: string | null;
  /** Amueblar mode: pieces can be selected and dragged on the floor. */
  editable: boolean;
  walls: WallGeometry[];
}

/**
 * Furniture in 3D. Plan front (+y) is scene +z, which is also where the models face.
 * Model pieces show a box while their file loads. In Amueblar mode pieces can be dragged
 * across the floor with the same wall snapping as in the plan.
 */
export function FurnitureMeshes({ furniture, selectedId, editable, walls }: FurnitureMeshesProps) {
  const select = useProjectStore((state) => state.select);
  // Read at event time: the camera controls are mutable Three.js state, not React state.
  const getThree = useThree((state) => state.get);
  const [drag, setDrag] = useState<Drag | null>(null);

  const setControlsEnabled = (enabled: boolean) => {
    const controls = getThree().controls as unknown as { enabled: boolean } | null;
    if (controls) controls.enabled = enabled;
  };

  const startDrag = (item: Furniture, event: ThreeEvent<PointerEvent>) => {
    if (!editable || event.button !== 0) return;
    event.stopPropagation();
    select({ kind: 'furniture', id: item.id });
    const point = floorPoint(event.ray);
    if (!point) return;
    // Keep receiving pointer moves even when the cursor leaves the piece, and stop the camera orbiting.
    (event.target as unknown as Element).setPointerCapture(event.pointerId);
    setControlsEnabled(false);
    setDrag({ id: item.id, grab: { x: item.x - point.x, y: item.y - point.y }, x: item.x, y: item.y, moved: false });
  };

  const moveDrag = (item: Furniture, event: ThreeEvent<PointerEvent>) => {
    if (!drag || drag.id !== item.id) return;
    const point = floorPoint(event.ray);
    if (!point) return;
    const raw = { x: point.x + drag.grab.x, y: point.y + drag.grab.y, width: item.width, depth: item.depth, rotation: item.rotation };
    const position = event.shiftKey ? raw : snapFurnitureToWalls(raw, walls, SNAP_CM);
    setDrag({ ...drag, x: Math.round(position.x), y: Math.round(position.y), moved: true });
  };

  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!drag) return;
    (event.target as unknown as Element).releasePointerCapture(event.pointerId);
    setControlsEnabled(true);
    if (drag.moved) useProjectStore.getState().updateFurniture(drag.id, { x: drag.x, y: drag.y });
    setDrag(null);
  };

  return (
    <>
      {furniture.map((original) => {
        const item = drag && drag.id === original.id ? { ...original, x: drag.x, y: drag.y } : original;
        const model = catalogItem(item.catalogId).model;
        const selected = item.id === selectedId;
        return (
          <group
            key={item.id}
            position={toScene({ x: item.x, y: item.y })}
            rotation-y={planAngleToRotationY(item.rotation)}
            onPointerDown={editable ? (event) => startDrag(original, event) : undefined}
            onPointerMove={editable ? (event) => moveDrag(original, event) : undefined}
            onPointerUp={editable ? endDrag : undefined}
            onPointerOver={editable ? () => (document.body.style.cursor = 'grab') : undefined}
            onPointerOut={editable ? () => (document.body.style.cursor = '') : undefined}
          >
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

import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useEffectEvent, useMemo, useState, type ComponentRef } from 'react';
import { getWalls, perimeterCorners, perimeterPolygon, type Floor } from '../../domain';
import { useProjectStore } from '../../store/projectStore';
import { useActiveFloor } from '../../store/selectors';
import { FloorMesh } from './FloorMesh';
import { sceneBounds, SCENE_COLORS, type SceneBounds } from './scene';
import { FurnitureMeshes } from './FurnitureMeshes';
import { OpeningMeshes } from './OpeningMeshes';
import { ViewpointArrow } from './ViewpointArrow';
import { WallMesh } from "./WallMesh";
import { ZoneFloors } from './ZoneFloors';

type Controls = ComponentRef<typeof OrbitControls>;

/** Angle (degrees) of each wall, needed to orient its boxes. */
function wallAngles(floor: Floor): Map<string, number> {
  const angles = new Map<string, number>();
  for (const segment of floor.perimeter.segments) angles.set(segment.id, segment.angle);
  for (const partition of floor.partitions) {
    angles.set(partition.id, (Math.atan2(partition.b.y - partition.a.y, partition.b.x - partition.a.x) * 180) / Math.PI);
  }
  return angles;
}

/** Places the camera looking at the plan from above at an angle, like a scale model. */
function CameraFit({ bounds, controls, fitRequest }: { bounds: SceneBounds | null; controls: Controls | null; fitRequest: number }) {
  const hasContent = bounds !== null;

  // Reads the latest bounds without re-running the effect on every edit (the camera must not jump while drawing).
  const fit = useEffectEvent(() => {
    if (!controls || !bounds) return;
    const [cx, cy, cz] = bounds.center;
    const distance = bounds.size * 1.3 + 3;
    controls.object.position.set(cx + distance * 0.55, cy + distance * 0.85, cz + distance * 0.75);
    controls.target.set(cx, cy, cz);
    controls.update();
  });

  // Refit when asked, when the controls appear and when the plan gets its first wall.
  useEffect(() => {
    fit();
  }, [controls, fitRequest, hasContent]);

  return null;
}

export default function Viewer3D({ onHide }: { onHide: () => void }) {
  const floor = useActiveFloor();
  const selection = useProjectStore((state) => state.selection);
  const mode = useProjectStore((state) => state.mode);
  const select = useProjectStore((state) => state.select);
  const elevationWallId = useProjectStore((state) => state.elevationWallId);
  const elevationSide = useProjectStore((state) => state.elevationSide);
  const [controls, setControls] = useState<Controls | null>(null);
  const [fitRequest, setFitRequest] = useState(0);

  const walls = getWalls(floor);
  const elevationWall = walls.find((wall) => wall.id === elevationWallId);
  const angles = wallAngles(floor);
  const polygon = useMemo(() => perimeterPolygon(floor.perimeter), [floor.perimeter]);
  const bounds = sceneBounds(perimeterCorners(floor.perimeter));
  const selectedId = selection?.kind === 'segment' || selection?.kind === 'partition' ? selection.id : null;
  const lightTarget = bounds?.center ?? [0, 0, 0];
  const shadowExtent = (bounds?.size ?? 10) * 0.8 + 2;

  return (
    <div className="viewer3d">
      <Canvas shadows="percentage" camera={{ fov: 45, near: 0.1, far: 300, position: [8, 10, 12] }}>
        <color attach="background" args={[SCENE_COLORS.background]} />
        <hemisphereLight args={['#ffffff', '#b9b3a8', 1.1]} />
        <directionalLight
          position={[lightTarget[0] + 6, 14, lightTarget[2] + 4]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-shadowExtent}
          shadow-camera-right={shadowExtent}
          shadow-camera-top={shadowExtent}
          shadow-camera-bottom={-shadowExtent}
          shadow-bias={-0.0005}
        />

        <mesh rotation-x={-Math.PI / 2} position={[lightTarget[0], -0.01, lightTarget[2]]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color={SCENE_COLORS.ground} roughness={1} />
        </mesh>

        {polygon && <FloorMesh polygon={polygon} finish={floor.floorFinish} />}
        <ZoneFloors zones={floor.zones} />
        <OpeningMeshes floor={floor} />
        <FurnitureMeshes
          furniture={floor.furniture}
          selectedId={selection?.kind === 'furniture' ? selection.id : null}
          editable={mode === 'furnish'}
          walls={walls}
        />
        {elevationWall && <ViewpointArrow wall={elevationWall} side={elevationSide} />}
        {walls.map((wall) => (
          <WallMesh
            key={wall.id}
            wall={wall}
            angle={angles.get(wall.id) ?? 0}
            openings={floor.openings}
            selected={wall.id === selectedId}
            highlighted={wall.id === elevationWallId}
            selectedSide={selection?.kind === 'wallFace' && selection.id === wall.id ? (selection.side ?? null) : null}
            onFaceClick={mode === 'finishes' ? (side) => select({ kind: 'wallFace', id: wall.id, side }) : undefined}
          />
        ))}

        <OrbitControls ref={setControls} makeDefault maxPolarAngle={Math.PI / 2 - 0.05} minDistance={1} maxDistance={200} />
        <CameraFit bounds={bounds} controls={controls} fitRequest={fitRequest} />
      </Canvas>

      <div className="viewer3d__toolbar">
        <button onClick={() => setFitRequest((n) => n + 1)} title="Volver a centrar la vista">
          ⤢ Encuadrar
        </button>
        <button onClick={onHide} title="Ocultar la vista 3D (se recupera desde la pestaña de la derecha)">
          Ocultar 3D
        </button>
      </div>
      {walls.length === 0 && <div className="viewer3d__empty">Dibuja el perímetro en el plano para verlo en 3D</div>}
      <div className="viewer3d__hint">Arrastrar: girar · botón derecho: desplazar · rueda: zoom · doble clic en una pared: vista frontal</div>
    </div>
  );
}

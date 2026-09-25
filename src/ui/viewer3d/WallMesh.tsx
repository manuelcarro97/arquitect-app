import { Edges } from '@react-three/drei';
import { direction, type Opening, type WallGeometry } from '../../domain';
import { useProjectStore } from '../../store/projectStore';
import { CM_TO_M, planAngleToRotationY, SCENE_COLORS, toScene } from './scene';
import { wallPieces } from './wallPieces';

interface WallMeshProps {
  wall: WallGeometry;
  angle: number;
  openings: Opening[];
  selected: boolean;
  /** Wall currently shown in the elevation view. */
  highlighted?: boolean;
}

export function WallMesh({ wall, angle, openings, selected, highlighted = false }: WallMeshProps) {
  const unit = direction(angle);
  // Perimeter walls are lengthened by half their thickness so the corners close.
  const extension = wall.kind === 'perimeter' ? wall.thickness / 2 : 0;
  const color = highlighted ? SCENE_COLORS.wallElevation : selected ? SCENE_COLORS.wallSelected : SCENE_COLORS.wall;
  const openElevation = useProjectStore((state) => state.openElevation);

  return (
    <>
      {wallPieces(wall, openings, extension).map((piece, i) => {
        const along = (piece.from + piece.to) / 2;
        const center = { x: wall.start.x + unit.x * along, y: wall.start.y + unit.y * along };
        return (
          <mesh
            key={i}
            position={toScene(center, (piece.bottom + piece.top) / 2)}
            rotation-y={planAngleToRotationY(angle)}
            castShadow
            receiveShadow
            onDoubleClick={(event) => {
              event.stopPropagation();
              openElevation(wall.id);
            }}
          >
            <boxGeometry
              args={[(piece.to - piece.from) * CM_TO_M, (piece.top - piece.bottom) * CM_TO_M, wall.thickness * CM_TO_M]}
            />
            <meshStandardMaterial color={color} roughness={0.9} />
            <Edges color={SCENE_COLORS.wallEdge} threshold={20} />
          </mesh>
        );
      })}
    </>
  );
}

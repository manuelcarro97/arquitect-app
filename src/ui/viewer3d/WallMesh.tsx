import { Edges } from '@react-three/drei';
import { direction, type Opening, type WallGeometry, type WallSide } from '../../domain';
import { useProjectStore } from '../../store/projectStore';
import { CM_TO_M, planAngleToRotationY, SCENE_COLORS, toScene } from './scene';
import { SurfaceMaterial } from './SurfaceMaterial';
import { wallPieces } from './wallPieces';

interface WallMeshProps {
  wall: WallGeometry;
  angle: number;
  openings: Opening[];
  selected: boolean;
  /** Wall currently shown in the elevation view. */
  highlighted?: boolean;
  /** Acabados mode: clicking face A or B of the wall (double click is then disabled). */
  onFaceClick?: (side: WallSide) => void;
}

/**
 * Box faces of each piece, in Three.js order: +x, -x, +y, -y, +z, -z.
 * The box is turned so its local +z points along the wall normal, i.e. towards face A.
 */
const FACE_A_INDEX = 4;
const FACE_B_INDEX = 5;
const PLAIN_FACES = [0, 1, 2, 3];

export function WallMesh({ wall, angle, openings, selected, highlighted = false, onFaceClick }: WallMeshProps) {
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
        const sizeCm = { width: piece.to - piece.from, height: piece.top - piece.bottom };
        return (
          <mesh
            key={i}
            position={toScene(center, (piece.bottom + piece.top) / 2)}
            rotation-y={planAngleToRotationY(angle)}
            castShadow
            receiveShadow
            onClick={(event) => {
              const index = event.face?.materialIndex;
              if (!onFaceClick || (index !== FACE_A_INDEX && index !== FACE_B_INDEX)) return;
              event.stopPropagation();
              onFaceClick(index === FACE_A_INDEX ? 'A' : 'B');
            }}
            onDoubleClick={
              onFaceClick
                ? undefined
                : (event) => {
                    event.stopPropagation();
                    openElevation(wall.id);
                  }
            }
          >
            <boxGeometry args={[sizeCm.width * CM_TO_M, sizeCm.height * CM_TO_M, wall.thickness * CM_TO_M]} />
            {PLAIN_FACES.map((face) => (
              <meshStandardMaterial key={face} attach={`material-${face}`} color={color} roughness={0.9} />
            ))}
            <SurfaceMaterial
              attach={`material-${FACE_A_INDEX}`}
              materialId={highlighted || selected ? undefined : wall.finishA}
              fallback={color}
              sizeCm={sizeCm}
            />
            <SurfaceMaterial
              attach={`material-${FACE_B_INDEX}`}
              materialId={highlighted || selected ? undefined : wall.finishB}
              fallback={color}
              sizeCm={sizeCm}
            />
            <Edges color={SCENE_COLORS.wallEdge} threshold={20} />
          </mesh>
        );
      })}
    </>
  );
}

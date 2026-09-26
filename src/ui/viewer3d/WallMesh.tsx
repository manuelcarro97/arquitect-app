import { Edges } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { Opening, WallGeometry, WallSide } from '../../domain';
import { useProjectStore } from '../../store/projectStore';
import { planAngleToRotationY, SCENE_COLORS, toScene } from './scene';
import { SurfaceMaterial } from './SurfaceMaterial';
import { WALL_FACE, wallPieceGeometry } from './wallGeometry';
import type { WallEnds } from './wallJoints';
import { wallPieces, type WallPiece } from './wallPieces';

interface WallMeshProps {
  wall: WallGeometry;
  angle: number;
  openings: Opening[];
  /** Where each face starts and ends (mitred corners); square ends when omitted. */
  ends?: WallEnds;
  selected: boolean;
  /** Wall currently shown in the elevation view. */
  highlighted?: boolean;
  /** Acabados mode: clicking face A or B of the wall (double click is then disabled). */
  onFaceClick?: (side: WallSide) => void;
}

const PLAIN_FACES = [WALL_FACE.end, WALL_FACE.start, WALL_FACE.top, WALL_FACE.bottom];

interface PieceMeshProps {
  piece: WallPiece;
  thickness: number;
  color: string;
  finishA: string | undefined;
  finishB: string | undefined;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void;
}

function PieceMesh({ piece, thickness, color, finishA, finishB, onClick, onDoubleClick }: PieceMeshProps) {
  const { fromA, fromB, toA, toB, bottom, top } = piece;
  const geometry = useMemo(
    () => wallPieceGeometry({ fromA, fromB, toA, toB, bottom, top }, thickness),
    [fromA, fromB, toA, toB, bottom, top, thickness],
  );
  // The geometry is created here, not by React Three Fiber, so it must be freed here too.
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow onClick={onClick} onDoubleClick={onDoubleClick}>
      {PLAIN_FACES.map((face) => (
        <meshStandardMaterial key={face} attach={`material-${face}`} color={color} roughness={0.9} />
      ))}
      <SurfaceMaterial attach={`material-${WALL_FACE.A}`} materialId={finishA} fallback={color} />
      <SurfaceMaterial attach={`material-${WALL_FACE.B}`} materialId={finishB} fallback={color} />
      <Edges color={SCENE_COLORS.wallEdge} threshold={20} />
    </mesh>
  );
}

export function WallMesh({ wall, angle, openings, ends, selected, highlighted = false, onFaceClick }: WallMeshProps) {
  const color = highlighted ? SCENE_COLORS.wallElevation : selected ? SCENE_COLORS.wallSelected : SCENE_COLORS.wall;
  const openElevation = useProjectStore((state) => state.openElevation);
  const showFinish = !highlighted && !selected;

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    const index = event.face?.materialIndex;
    if (!onFaceClick || (index !== WALL_FACE.A && index !== WALL_FACE.B)) return;
    event.stopPropagation();
    onFaceClick(index === WALL_FACE.A ? 'A' : 'B');
  };
  const handleDoubleClick = onFaceClick
    ? undefined
    : (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        openElevation(wall.id);
      };

  // One group per wall at its start point, turned along it: pieces are built in the wall's own axes.
  return (
    <group position={toScene(wall.start)} rotation-y={planAngleToRotationY(angle)}>
      {wallPieces(wall, openings, ends).map((piece, i) => (
        <PieceMesh
          key={i}
          piece={piece}
          thickness={wall.thickness}
          color={color}
          finishA={showFinish ? wall.finishA : undefined}
          finishB={showFinish ? wall.finishB : undefined}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        />
      ))}
    </group>
  );
}

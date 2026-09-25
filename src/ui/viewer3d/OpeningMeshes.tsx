import { Edges } from '@react-three/drei';
import { angleBetween, findWall, openingFrame, type Floor } from '../../domain';
import { CM_TO_M, planAngleToRotationY, toScene } from './scene';

const LEAF_THICKNESS_CM = 4;
const GLASS_THICKNESS_CM = 1;
/** How far doors are shown open, so the hole and the swing direction are both visible. */
const DOOR_OPEN_DEGREES = 70;

/** Glass panes in windows and half-open leaves in doors (the holes themselves are cut in WallMesh). */
export function OpeningMeshes({ floor }: { floor: Floor }) {
  return (
    <>
      {floor.openings.map((opening) => {
        const wall = findWall(floor, opening.wallId);
        if (!wall) return null;
        const frame = openingFrame(wall, opening);
        const rotationY = planAngleToRotationY(angleBetween(wall.start, wall.end));

        if (opening.type === 'window') {
          return (
            <mesh
              key={opening.id}
              position={toScene(frame.center, opening.sillHeight + opening.height / 2)}
              rotation-y={rotationY}
            >
              <boxGeometry args={[opening.width * CM_TO_M, opening.height * CM_TO_M, GLASS_THICKNESS_CM * CM_TO_M]} />
              <meshStandardMaterial color="#9ecbe0" transparent opacity={0.35} roughness={0.1} metalness={0.1} />
              <Edges color="#6f8fa0" />
            </mesh>
          );
        }

        // The leaf hangs from the hinge jamb; local +x runs along the wall, local +z towards face A.
        const towardsLatch = opening.hinge === 'end' ? -1 : 1;
        const towardsSide = opening.swingSide === 'B' ? -1 : 1;
        const openAngle = (-towardsLatch * towardsSide * DOOR_OPEN_DEGREES * Math.PI) / 180;
        return (
          <group key={opening.id} position={toScene(frame.hinge)} rotation-y={rotationY}>
            <group rotation-y={openAngle}>
              <mesh
                position={[(towardsLatch * opening.width * CM_TO_M) / 2, (opening.height * CM_TO_M) / 2, 0]}
                castShadow
              >
                <boxGeometry args={[opening.width * CM_TO_M, opening.height * CM_TO_M, LEAF_THICKNESS_CM * CM_TO_M]} />
                <meshStandardMaterial color="#b08a5b" roughness={0.7} />
                <Edges color="#6d5334" />
              </mesh>
            </group>
          </group>
        );
      })}
    </>
  );
}

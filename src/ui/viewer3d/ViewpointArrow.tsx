import { angleBetween, pointInFrontOf, type WallGeometry, type WallSide } from '../../domain';
import { planAngleToRotationY, SCENE_COLORS, toScene } from './scene';

/** Distance (cm) from the wall face to the arrow's tail, and eye height. */
const ARROW_DISTANCE_CM = 110;
const EYE_HEIGHT_CM = 160;
const SHAFT_M = 0.7;
const HEAD_M = 0.22;

/** Arrow at eye height on the side the elevation is seen from, pointing at the wall. */
export function ViewpointArrow({ wall, side }: { wall: WallGeometry; side: WallSide }) {
  const tail = pointInFrontOf(wall, side, wall.thickness / 2 + ARROW_DISTANCE_CM);
  const target = pointInFrontOf(wall, side, 0);
  const rotationY = planAngleToRotationY(angleBetween(tail, target));

  return (
    <group position={toScene(tail, EYE_HEIGHT_CM)} rotation-y={rotationY}>
      {/* Cylinders and cones are built along +Y; turning them -90° around Z lays them along +X (towards the wall). */}
      <mesh position={[SHAFT_M / 2, 0, 0]} rotation-z={-Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.035, SHAFT_M, 12]} />
        <meshStandardMaterial color={SCENE_COLORS.viewpoint} emissive={SCENE_COLORS.viewpoint} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[SHAFT_M + HEAD_M / 2, 0, 0]} rotation-z={-Math.PI / 2}>
        <coneGeometry args={[0.11, HEAD_M, 16]} />
        <meshStandardMaterial color={SCENE_COLORS.viewpoint} emissive={SCENE_COLORS.viewpoint} emissiveIntensity={0.3} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={SCENE_COLORS.viewpoint} />
      </mesh>
    </group>
  );
}

import { Group, Line } from 'react-konva';
import {
  getWalls,
  perimeterPolygon,
  wallDirection,
  type Floor,
  type Id,
  type WallGeometry,
  type WallSide,
  type Zone,
} from '../../../domain';
import { materialInfo } from '../../materials/materials';
import { CANVAS_COLORS } from '../colors';

const FACE_STRIP_PX = 4;

/** Line along one face of a wall, `inset` cm inside its surface (negative = outside). */
function facePoints(wall: WallGeometry, side: WallSide, inset: number): number[] {
  const direction = wallDirection(wall);
  const sign = side === 'A' ? 1 : -1;
  const offset = wall.thickness / 2 - inset;
  const nx = -direction.y * sign * offset;
  const ny = direction.x * sign * offset;
  return [wall.start.x + nx, wall.start.y + ny, wall.end.x + nx, wall.end.y + ny];
}

/** Zones coloured with their floor finish (when finishes are shown). */
export function zonesWithFloorColors(zones: Zone[]): Zone[] {
  return zones.map((zone) => ({ ...zone, color: materialInfo(zone.floorFinish)?.color ?? zone.color }));
}

/** General floor finish, drawn under everything (not clickable). */
export function FloorFinishFill({ floor }: { floor: Floor }) {
  const polygon = perimeterPolygon(floor.perimeter);
  const finish = materialInfo(floor.floorFinish);
  if (!polygon || !finish) return null;
  return <Line points={polygon.flatMap((p) => [p.x, p.y])} closed fill={finish.color} opacity={0.6} listening={false} />;
}

/** A coloured strip on each finished wall face, plus the selected face (Acabados mode). */
export function FinishStrips({
  floor,
  scale,
  selectedFace = null,
}: {
  floor: Floor;
  scale: number;
  selectedFace?: { id: Id; side: WallSide } | null;
}) {
  const strip = FACE_STRIP_PX / scale;
  return (
    <Group listening={false}>
      {getWalls(floor).flatMap((wall) =>
        (['A', 'B'] as const).map((side) => {
          const finish = materialInfo(side === 'A' ? wall.finishA : wall.finishB);
          const selected = selectedFace?.id === wall.id && selectedFace.side === side;
          if (!finish && !selected) return null;
          return (
            <Group key={`${wall.id}-${side}`}>
              {finish && <Line points={facePoints(wall, side, strip / 2)} stroke={finish.color} strokeWidth={strip} lineCap="butt" />}
              {selected && (
                <Line
                  points={facePoints(wall, side, -strip)}
                  stroke={CANVAS_COLORS.wallSelected}
                  strokeWidth={strip * 0.8}
                  dash={[8 / scale, 5 / scale]}
                />
              )}
            </Group>
          );
        }),
      )}
    </Group>
  );
}

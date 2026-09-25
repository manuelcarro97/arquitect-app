import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback } from 'react';
import { Group, Line } from 'react-konva';
import {
  getWalls,
  invalidPartitionIds,
  isPerimeterClosed,
  perimeterPolygon,
  pointInPolygon,
  wallDirection,
  type Id,
  type Point,
  type WallGeometry,
  type WallSide,
} from '../../../domain';
import { useProjectStore } from '../../../store/projectStore';
import { materialInfo } from '../../materials/materials';
import { CANVAS_COLORS } from '../colors';
import type { EditorContext, EditorController } from '../controller';
import { useFurniture } from '../furniture/useFurniture';
import { PartitionLayer } from '../layout/PartitionLayer';
import { ZoneLayer } from '../layout/ZoneLayer';
import { useOpenings } from '../openings/useOpenings';
import { PerimeterLayer } from '../PerimeterLayer';

const HINT =
  'Clic en una pared, en el lado que quieras cambiar · clic en una zona para su suelo · clic en el suelo libre para el suelo general · elige el material en el panel';
const FACE_STRIP_PX = 4;

/** Face of the wall the point is on: A if it lies on the side of the wall normal. */
function sideOf(wall: WallGeometry, point: Point): WallSide {
  const direction = wallDirection(wall);
  const across = (point.x - wall.start.x) * -direction.y + (point.y - wall.start.y) * direction.x;
  return across >= 0 ? 'A' : 'B';
}

/** Line along one face of a wall, just inside its surface. */
function facePoints(wall: WallGeometry, side: WallSide, inset: number): number[] {
  const direction = wallDirection(wall);
  const sign = side === 'A' ? 1 : -1;
  const offset = wall.thickness / 2 - inset;
  const nx = -direction.y * sign * offset;
  const ny = direction.x * sign * offset;
  return [wall.start.x + nx, wall.start.y + ny, wall.end.x + nx, wall.end.y + ny];
}

/** Acabados mode: paint and cover wall faces and choose floor finishes. Nothing can be moved. */
export function useFinishesController({ floor, scale, active }: EditorContext): EditorController {
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);
  const noTool = useCallback(() => {}, []);
  const closed = isPerimeterClosed(floor.perimeter);
  const walls = getWalls(floor);
  const polygon = perimeterPolygon(floor.perimeter);

  const furniture = useFurniture({ floor, scale, active: false, selectable: false });
  const openings = useOpenings({ floor, scale, placing: null, selectable: false, onExitTool: noTool });

  const selectFace = (wallId: Id, event: KonvaEventObject<MouseEvent>) => {
    if (!active || event.evt.button !== 0) return;
    event.cancelBubble = true;
    const wall = walls.find((w) => w.id === wallId);
    const world = event.target.getStage()?.getRelativePointerPosition();
    if (wall && world) select({ kind: 'wallFace', id: wallId, side: sideOf(wall, world) });
  };

  // Zones are drawn in the colour of their floor finish (or their own colour if they have none).
  const zones = floor.zones.map((zone) => ({ ...zone, color: materialInfo(zone.floorFinish)?.color ?? zone.color }));
  const defaultFloor = materialInfo(floor.floorFinish);
  const strip = FACE_STRIP_PX / scale;

  return {
    tools: [],
    showAngleSnap: false,
    layers: (
      <>
        {polygon && defaultFloor && (
          <Line points={polygon.flatMap((p) => [p.x, p.y])} closed fill={defaultFloor.color} opacity={0.6} listening={false} />
        )}
        <ZoneLayer
          zones={zones}
          scale={scale}
          selectedId={selection?.kind === 'zone' ? selection.id : null}
          interactive={active}
          onZonePointerDown={(zoneId, event) => {
            if (event.evt.button !== 0) return;
            event.cancelBubble = true;
            select({ kind: 'zone', id: zoneId });
          }}
          onVertexPointerDown={() => {}}
        />
        {furniture.layer}
        <PerimeterLayer
          perimeter={floor.perimeter}
          scale={scale}
          selectedId={null}
          interactive={active}
          onWallPointerDown={selectFace}
          onLabelClick={() => {}}
        />
        <PartitionLayer
          partitions={floor.partitions}
          scale={scale}
          selectedId={null}
          invalidIds={new Set(invalidPartitionIds(floor))}
          interactive={active}
          onPartitionPointerDown={selectFace}
          onHandlePointerDown={() => {}}
        />
        {openings.layer}
        {/* A coloured strip on each finished face, and the selected face highlighted. */}
        <Group listening={false}>
          {walls.flatMap((wall) =>
            (['A', 'B'] as const).map((side) => {
              const finish = materialInfo(side === 'A' ? wall.finishA : wall.finishB);
              const selected = selection?.kind === 'wallFace' && selection.id === wall.id && selection.side === side;
              if (!finish && !selected) return null;
              return (
                <Group key={`${wall.id}-${side}`}>
                  {finish && (
                    <Line points={facePoints(wall, side, strip / 2)} stroke={finish.color} strokeWidth={strip} lineCap="butt" />
                  )}
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
      </>
    ),
    hint: closed ? HINT : 'El perímetro no está cerrado: ciérralo en modo Estructura.',
    cursor: 'pointer',
    onPointerMove: () => {},
    onClick: (world, onEmpty) => {
      if (!onEmpty) return;
      if (polygon && pointInPolygon(world, polygon)) select({ kind: 'floor', id: 'floor' });
      else select(null);
    },
    onSecondaryClick: () => select(null),
  };
}

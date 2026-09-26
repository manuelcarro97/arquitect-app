import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback } from 'react';
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
import type { EditorContext, EditorController } from '../controller';
import { useFurniture } from '../furniture/useFurniture';
import { PartitionLayer } from '../layout/PartitionLayer';
import { ZoneLayer } from '../layout/ZoneLayer';
import { useOpenings } from '../openings/useOpenings';
import { PerimeterLayer } from '../PerimeterLayer';
import { FinishStrips, FloorFinishFill, zonesWithFloorColors } from './FinishOverlay';

const HINT =
  'Clic en una pared, en el lado que quieras cambiar · clic en una zona para su suelo · clic en el suelo libre para el suelo general · elige el material en el panel';

/** Face of the wall the point is on: A if it lies on the side of the wall normal. */
function sideOf(wall: WallGeometry, point: Point): WallSide {
  const direction = wallDirection(wall);
  const across = (point.x - wall.start.x) * -direction.y + (point.y - wall.start.y) * direction.x;
  return across >= 0 ? 'A' : 'B';
}

/** Acabados mode: paint and cover wall faces and choose floor finishes. Nothing can be moved. */
export function useFinishesController({ floor, scale, active, layers }: EditorContext): EditorController {
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);
  const noTool = useCallback(() => {}, []);
  const closed = isPerimeterClosed(floor.perimeter);
  const walls = getWalls(floor);
  const polygon = perimeterPolygon(floor.perimeter);

  const furniture = useFurniture({ floor, scale, active: false, selectable: false });
  const openings = useOpenings({ floor, scale, placing: null, selectable: false, onExitTool: noTool });

  const selectFace = (wallId: Id, event: KonvaEventObject<PointerEvent>) => {
    if (!active || event.evt.button !== 0) return;
    event.cancelBubble = true;
    const wall = walls.find((w) => w.id === wallId);
    const world = event.target.getStage()?.getRelativePointerPosition();
    if (wall && world) select({ kind: 'wallFace', id: wallId, side: sideOf(wall, world) });
  };

  const selectedFace =
    selection?.kind === 'wallFace' && selection.side ? { id: selection.id, side: selection.side } : null;

  return {
    tools: [],
    showAngleSnap: false,
    layers: (
      <>
        <FloorFinishFill floor={floor} />
        {layers.zones && (
          <ZoneLayer
            zones={zonesWithFloorColors(floor.zones)}
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
        )}
        {layers.furniture && furniture.layer}
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
        <FinishStrips floor={floor} scale={scale} selectedFace={selectedFace} />
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

import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useState } from 'react';
import {
  angleBetween,
  direction,
  distance,
  invalidPartitionIds,
  isPerimeterClosed,
  movePartitionEndpoint,
  movePartitionPerpendicular,
  updateZone,
  type Floor,
  type Id,
  type Point,
} from '../../../domain';
import { useProjectStore } from '../../../store/projectStore';
import type { EditorContext, EditorController } from '../controller';
import { FinishStrips, FloorFinishFill, zonesWithFloorColors } from '../finishes/FinishOverlay';
import { useFurniture } from '../furniture/useFurniture';
import { useOpenings } from '../openings/useOpenings';
import { PerimeterLayer } from '../PerimeterLayer';
import { snapPoint, snapTargetsFor } from '../pointSnap';
import { LENGTH_STEP_CM } from '../snap';
import { PartitionLayer, type PartitionEnd } from './PartitionLayer';
import { usePartitionTool } from './usePartitionTool';
import { useZoneTool } from './useZoneTool';
import { ZoneLayer } from './ZoneLayer';
import { useDragEnd } from '../dragEnd';

type LayoutTool = 'select' | 'partition' | 'zone' | 'door' | 'window';

type Drag =
  | { kind: 'partition'; id: Id; origin: Point; offset: number }
  | { kind: 'endpoint'; id: Id; end: PartitionEnd; point: Point }
  | { kind: 'vertex'; zoneId: Id; index: number; point: Point };

const SNAP_PX = 10;
const SELECT_HINT =
  'Clic en un tabique o zona para seleccionarlo · arrastra el tabique para moverlo · arrastra los puntos blancos para ajustar · doble clic en una pared = vista frontal · Supr para borrar';

function worldFrom(event: KonvaEventObject<PointerEvent>): Point | null {
  return event.target.getStage()?.getRelativePointerPosition() ?? null;
}

/** Applies the drag in progress to the floor, for previewing. Returns null if the move is not allowed. */
function applyDrag(floor: Floor, drag: Drag): Floor | null {
  if (drag.kind === 'partition') {
    if (drag.offset === 0) return floor;
    const result = movePartitionPerpendicular(floor, drag.id, drag.offset);
    return result.ok ? result.value : null;
  }
  if (drag.kind === 'endpoint') {
    const result = movePartitionEndpoint(floor, drag.id, drag.end, drag.point);
    return result.ok ? result.value : null;
  }
  const zone = floor.zones.find((z) => z.id === drag.zoneId);
  if (!zone) return floor;
  const points = zone.points.map((p, i) => (i === drag.index ? drag.point : p));
  const result = updateZone(floor, drag.zoneId, { points });
  return result.ok ? result.value : null;
}

/** Distribución mode: partitions and zones inside the (locked) perimeter. */
export function useLayoutController({ floor, scale, angleStep, active, layers }: EditorContext): EditorController {
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);
  const openElevation = useProjectStore((state) => state.openElevation);
  const store = useProjectStore.getState;

  const [tool, setTool] = useState<LayoutTool>('select');
  const [drag, setDrag] = useState<Drag | null>(null);
  const closed = isPerimeterClosed(floor.perimeter);

  const partitionTool = usePartitionTool({
    enabled: active && closed && tool === 'partition',
    floor,
    scale,
    angleStep,
    onExit: () => setTool('select'),
  });
  const zoneTool = useZoneTool({
    enabled: active && closed && tool === 'zone',
    floor,
    scale,
    onExit: () => setTool('select'),
  });

  const previewFloor = drag ? applyDrag(floor, drag) : floor;
  const displayed = previewFloor ?? floor;
  const exitTool = useCallback(() => setTool('select'), []);
  const openings = useOpenings({
    floor: displayed,
    scale,
    placing: active && closed && (tool === 'door' || tool === 'window') ? tool : null,
    selectable: active && tool === 'select',
    onExitTool: exitTool,
  });
  // Furniture is only shown here; it is edited in Amueblar mode.
  const furniture = useFurniture({ floor: displayed, scale, active: false, selectable: false });
  const invalidIds = new Set(invalidPartitionIds(displayed));
  if (drag && !previewFloor && drag.kind !== 'vertex') invalidIds.add(drag.id);

  useDragEnd(
    drag !== null,
    () => {
      if (!drag) return;
      const { movePartition, movePartitionEndpoint: moveEnd, updateZone: setZone } = store();
      if (drag.kind === 'partition' && drag.offset !== 0) {
        movePartition(drag.id, drag.offset);
      } else if (drag.kind === 'endpoint') {
        const partition = floor.partitions.find((p) => p.id === drag.id);
        if (partition && distance(partition[drag.end], drag.point) > 0) moveEnd(drag.id, drag.end, drag.point);
      } else if (drag.kind === 'vertex') {
        const zone = floor.zones.find((z) => z.id === drag.zoneId);
        if (zone) setZone(drag.zoneId, { points: zone.points.map((p, i) => (i === drag.index ? drag.point : p)) });
      }
      setDrag(null);
    },
    () => setDrag(null),
  );

  const selectedPartitionId = selection?.kind === 'partition' ? selection.id : null;
  const selectedZoneId = selection?.kind === 'zone' ? selection.id : null;
  const interactive = active && tool === 'select';

  const startDrag = (event: KonvaEventObject<PointerEvent>, makeDrag: (world: Point) => Drag) => {
    if (event.evt.button !== 0) return;
    event.cancelBubble = true;
    const world = worldFrom(event);
    if (world) setDrag(makeDrag(world));
  };

  const chooseTool = (next: LayoutTool) => {
    partitionTool.reset();
    zoneTool.reset();
    setTool(next);
  };

  const hint = !closed
    ? 'El perímetro no está cerrado: ciérralo en modo Estructura para distribuir el interior.'
    : drag && !previewFloor
      ? 'Ahí no: el tabique saldría del perímetro.'
      : (openings.hint ?? partitionTool.hint ?? zoneTool.hint ?? SELECT_HINT);

  return {
    tools: [
      { id: 'select', label: '↖ Seleccionar', title: 'Seleccionar, mover y ajustar', active: tool === 'select', onClick: () => chooseTool('select') },
      {
        id: 'partition',
        label: '▭ Tabique',
        title: 'Dibujar tabiques',
        active: tool === 'partition',
        disabled: !closed,
        onClick: () => chooseTool('partition'),
      },
      {
        id: 'zone',
        label: '⬠ Zona',
        title: 'Marcar una zona (habitación) con nombre y color',
        active: tool === 'zone',
        disabled: !closed,
        onClick: () => chooseTool('zone'),
      },
      {
        id: 'door',
        label: '🚪 Puerta',
        title: 'Colocar puertas en paredes y tabiques',
        active: tool === 'door',
        disabled: !closed,
        onClick: () => chooseTool('door'),
      },
      {
        id: 'window',
        label: '🪟 Ventana',
        title: 'Colocar ventanas en paredes y tabiques',
        active: tool === 'window',
        disabled: !closed,
        onClick: () => chooseTool('window'),
      },
    ],
    showAngleSnap: tool === 'partition',
    toolOptions: openings.toolOptions,
    layers: (
      <>
        {layers.finishes && <FloorFinishFill floor={floor} />}
        <ZoneLayer
          zones={layers.zones ? (layers.finishes ? zonesWithFloorColors(displayed.zones) : displayed.zones) : []}
          scale={scale}
          selectedId={selectedZoneId}
          interactive={interactive}
          onZonePointerDown={(zoneId, event) => {
            if (event.evt.button !== 0) return;
            event.cancelBubble = true;
            select({ kind: 'zone', id: zoneId });
          }}
          onVertexPointerDown={(zoneId, index, event) =>
            startDrag(event, (world) => ({ kind: 'vertex', zoneId, index, point: world }))
          }
        />
        {layers.furniture && furniture.layer}
        <PerimeterLayer
          perimeter={floor.perimeter}
          scale={scale}
          selectedId={null}
          interactive={false}
          locked
          onWallPointerDown={() => {}}
          onLabelClick={() => {}}
          onWallDoubleClick={tool === 'select' ? openElevation : undefined}
        />
        <PartitionLayer
          partitions={displayed.partitions}
          scale={scale}
          selectedId={selectedPartitionId}
          invalidIds={invalidIds}
          interactive={interactive}
          onPartitionPointerDown={(partitionId, event) => {
            select({ kind: 'partition', id: partitionId });
            startDrag(event, (world) => ({ kind: 'partition', id: partitionId, origin: world, offset: 0 }));
          }}
          onHandlePointerDown={(partitionId, end, event) => {
            const partition = floor.partitions.find((p) => p.id === partitionId);
            if (partition) startDrag(event, () => ({ kind: 'endpoint', id: partitionId, end, point: partition[end] }));
          }}
          onPartitionDoubleClick={tool === 'select' ? openElevation : undefined}
        />
        {openings.layer}
        {layers.finishes && <FinishStrips floor={displayed} scale={scale} />}
        {partitionTool.overlay}
        {zoneTool.overlay}
      </>
    ),
    hint,
    cursor: tool === 'select' ? 'default' : 'crosshair',
    onPointerMove: (world, shiftKey) => {
      if (openings.handlePointerMove(world)) return;
      if (drag) {
        const tolerance = SNAP_PX / scale;
        if (drag.kind === 'partition') {
          const partition = floor.partitions.find((p) => p.id === drag.id);
          if (!partition) return;
          const unit = direction(angleBetween(partition.a, partition.b));
          const offset = Math.round((world.x - drag.origin.x) * -unit.y + (world.y - drag.origin.y) * unit.x);
          if (offset !== drag.offset) setDrag({ ...drag, offset });
        } else if (drag.kind === 'endpoint') {
          const partition = floor.partitions.find((p) => p.id === drag.id);
          const targets = snapTargetsFor(floor, { excludePartitionId: drag.id });
          // Linked ends move along with this one, so their current position is not a useful target.
          const origin = partition?.[drag.end];
          const movable = origin ? targets.points.filter((p) => distance(p, origin) > tolerance) : targets.points;
          setDrag({ ...drag, point: snapPoint(world, { ...targets, points: movable }, tolerance, LENGTH_STEP_CM).point });
        } else {
          const targets = snapTargetsFor(floor);
          const otherVertices = floor.zones.flatMap((zone) =>
            zone.id === drag.zoneId ? zone.points.filter((_, i) => i !== drag.index) : zone.points,
          );
          const withVertices = { ...targets, points: [...targets.points, ...otherVertices] };
          setDrag({ ...drag, point: snapPoint(world, withVertices, tolerance, LENGTH_STEP_CM).point });
        }
        return;
      }
      partitionTool.handlePointerMove(world, shiftKey);
      zoneTool.handlePointerMove(world);
    },
    onClick: (_world, onEmpty) => {
      if (tool === 'partition') partitionTool.handleClick();
      else if (tool === 'zone') zoneTool.handleClick();
      else if (tool === 'door' || tool === 'window') openings.handleClick();
      else if (onEmpty) select(null);
    },
    onSecondaryClick: () => {
      if (tool === 'partition') partitionTool.handleSecondaryClick();
      else if (tool === 'zone') zoneTool.handleSecondaryClick();
      else if (tool !== 'select') setTool('select');
      else select(null);
    },
  };
}

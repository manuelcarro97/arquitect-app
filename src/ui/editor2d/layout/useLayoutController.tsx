import type { KonvaEventObject } from 'konva/lib/Node';
import { useEffect, useState } from 'react';
import {
  angleBetween,
  direction,
  invalidPartitionIds,
  isPerimeterClosed,
  movePartition,
  setPartitionEndpoints,
  updateZone,
  type Floor,
  type Id,
  type Point,
} from '../../../domain';
import { useProjectStore } from '../../../store/projectStore';
import type { EditorContext, EditorController } from '../controller';
import { PerimeterLayer } from '../PerimeterLayer';
import { snapPoint, snapTargetsFor } from '../pointSnap';
import { LENGTH_STEP_CM } from '../snap';
import { PartitionLayer, type PartitionEnd } from './PartitionLayer';
import { usePartitionTool } from './usePartitionTool';
import { useZoneTool } from './useZoneTool';
import { ZoneLayer } from './ZoneLayer';

type LayoutTool = 'select' | 'partition' | 'zone';

type Drag =
  | { kind: 'partition'; id: Id; origin: Point; offset: number }
  | { kind: 'endpoint'; id: Id; end: PartitionEnd; point: Point }
  | { kind: 'vertex'; zoneId: Id; index: number; point: Point };

const SNAP_PX = 10;
const SELECT_HINT =
  'Clic en un tabique o zona para seleccionarlo · arrastra el tabique para moverlo · arrastra los puntos blancos para ajustar · Supr para borrar';

function worldFrom(event: KonvaEventObject<MouseEvent>): Point | null {
  return event.target.getStage()?.getRelativePointerPosition() ?? null;
}

/** Applies the drag in progress to the floor, for previewing. Returns null if the move is not allowed. */
function applyDrag(floor: Floor, drag: Drag): Floor | null {
  if (drag.kind === 'partition') {
    const partition = floor.partitions.find((p) => p.id === drag.id);
    if (!partition || drag.offset === 0) return floor;
    const unit = direction(angleBetween(partition.a, partition.b));
    const result = movePartition(floor, drag.id, { x: -unit.y * drag.offset, y: unit.x * drag.offset });
    return result.ok ? result.value : null;
  }
  if (drag.kind === 'endpoint') {
    const partition = floor.partitions.find((p) => p.id === drag.id);
    if (!partition) return floor;
    const a = drag.end === 'a' ? drag.point : partition.a;
    const b = drag.end === 'b' ? drag.point : partition.b;
    const result = setPartitionEndpoints(floor, drag.id, a, b);
    return result.ok ? result.value : null;
  }
  const zone = floor.zones.find((z) => z.id === drag.zoneId);
  if (!zone) return floor;
  const points = zone.points.map((p, i) => (i === drag.index ? drag.point : p));
  const result = updateZone(floor, drag.zoneId, { points });
  return result.ok ? result.value : null;
}

/** Distribución mode: partitions and zones inside the (locked) perimeter. */
export function useLayoutController({ floor, scale, angleStep, active }: EditorContext): EditorController {
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);
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
  const invalidIds = new Set(invalidPartitionIds(displayed));
  if (drag && !previewFloor && drag.kind !== 'vertex') invalidIds.add(drag.id);

  useEffect(() => {
    if (!drag) return;
    const onMouseUp = () => {
      const { movePartition: move, setPartitionEndpoints: setEnds, updateZone: setZone } = store();
      if (drag.kind === 'partition' && drag.offset !== 0) {
        const partition = floor.partitions.find((p) => p.id === drag.id);
        if (partition) {
          const unit = direction(angleBetween(partition.a, partition.b));
          move(drag.id, { x: -unit.y * drag.offset, y: unit.x * drag.offset });
        }
      } else if (drag.kind === 'endpoint') {
        const partition = floor.partitions.find((p) => p.id === drag.id);
        if (partition) {
          setEnds(drag.id, drag.end === 'a' ? drag.point : partition.a, drag.end === 'b' ? drag.point : partition.b);
        }
      } else if (drag.kind === 'vertex') {
        const zone = floor.zones.find((z) => z.id === drag.zoneId);
        if (zone) setZone(drag.zoneId, { points: zone.points.map((p, i) => (i === drag.index ? drag.point : p)) });
      }
      setDrag(null);
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [drag, floor, store]);

  const selectedPartitionId = selection?.kind === 'partition' ? selection.id : null;
  const selectedZoneId = selection?.kind === 'zone' ? selection.id : null;
  const interactive = active && tool === 'select';

  const startDrag = (event: KonvaEventObject<MouseEvent>, makeDrag: (world: Point) => Drag) => {
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
      : (partitionTool.hint ?? zoneTool.hint ?? SELECT_HINT);

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
    ],
    showAngleSnap: tool === 'partition',
    layers: (
      <>
        <ZoneLayer
          zones={displayed.zones}
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
        <PerimeterLayer
          perimeter={floor.perimeter}
          scale={scale}
          selectedId={null}
          interactive={false}
          locked
          onWallPointerDown={() => {}}
          onLabelClick={() => {}}
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
        />
        {partitionTool.overlay}
        {zoneTool.overlay}
      </>
    ),
    hint,
    cursor: tool === 'select' ? 'default' : 'crosshair',
    onPointerMove: (world, shiftKey) => {
      if (drag) {
        const tolerance = SNAP_PX / scale;
        if (drag.kind === 'partition') {
          const partition = floor.partitions.find((p) => p.id === drag.id);
          if (!partition) return;
          const unit = direction(angleBetween(partition.a, partition.b));
          const offset = Math.round((world.x - drag.origin.x) * -unit.y + (world.y - drag.origin.y) * unit.x);
          if (offset !== drag.offset) setDrag({ ...drag, offset });
        } else if (drag.kind === 'endpoint') {
          const targets = snapTargetsFor(floor, { excludePartitionId: drag.id });
          setDrag({ ...drag, point: snapPoint(world, targets, tolerance, LENGTH_STEP_CM).point });
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
      else if (onEmpty) select(null);
    },
    onSecondaryClick: () => {
      if (tool === 'partition') partitionTool.handleSecondaryClick();
      else if (tool === 'zone') zoneTool.handleSecondaryClick();
      else select(null);
    },
  };
}

import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback, useState } from 'react';
import { direction, invalidPartitionIds, isPerimeterClosed, moveSegment, type Id, type Point } from '../../../domain';
import { useProjectStore } from '../../../store/projectStore';
import type { EditorContext, EditorController } from '../controller';
import { FinishStrips, FloorFinishFill, zonesWithFloorColors } from '../finishes/FinishOverlay';
import { PartitionLayer } from '../layout/PartitionLayer';
import { ZoneLayer } from '../layout/ZoneLayer';
import { useFurniture } from '../furniture/useFurniture';
import { useOpenings } from '../openings/useOpenings';
import { PerimeterLayer } from '../PerimeterLayer';
import { useDrawTool } from '../useDrawTool';
import { useDragEnd } from '../dragEnd';

type StructureTool = 'draw' | 'select' | 'door' | 'window';

interface WallDrag {
  segmentId: Id;
  origin: Point;
  offset: number;
}

const SELECT_HINT =
  'Clic en una pared para seleccionarla · arrástrala para moverla · clic en una cota para editarla · doble clic = vista frontal (puertas y ventanas) · Supr para borrar';

/** Estructura mode: draw the perimeter, select/move/delete its walls. */
export function useStructureController({ floor, scale, angleStep, active, layers }: EditorContext): EditorController {
  const perimeter = floor.perimeter;
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);
  const openElevation = useProjectStore((state) => state.openElevation);
  const requestLengthEdit = useProjectStore((state) => state.requestLengthEdit);
  const movePerimeterSegment = useProjectStore((state) => state.movePerimeterSegment);

  const [chosenTool, setChosenTool] = useState<StructureTool>('draw');
  const [wallDrag, setWallDrag] = useState<WallDrag | null>(null);
  const closed = isPerimeterClosed(perimeter);
  const tool: StructureTool = closed && chosenTool === 'draw' ? 'select' : chosenTool;
  const exitTool = useCallback(() => setChosenTool('select'), []);

  const drawTool = useDrawTool({
    enabled: active && tool === 'draw',
    perimeter,
    scale,
    angleStep,
    onExit: () => setChosenTool('select'),
  });

  // Live preview while dragging a wall; the store is only updated on release (one undo step).
  const previewResult =
    wallDrag && wallDrag.offset !== 0 ? moveSegment(perimeter, wallDrag.segmentId, wallDrag.offset) : null;
  const displayedPerimeter = previewResult?.ok ? previewResult.value : perimeter;

  useDragEnd(
    wallDrag !== null,
    () => {
      if (wallDrag && wallDrag.offset !== 0) movePerimeterSegment(wallDrag.segmentId, wallDrag.offset);
      setWallDrag(null);
    },
    () => setWallDrag(null),
  );

  const handleWallPointerDown = (segmentId: Id, event: KonvaEventObject<PointerEvent>) => {
    if (event.evt.button !== 0) return;
    event.cancelBubble = true;
    const world = event.target.getStage()?.getRelativePointerPosition();
    select({ kind: 'segment', id: segmentId });
    if (world) setWallDrag({ segmentId, origin: world, offset: 0 });
  };

  const openings = useOpenings({
    floor: { ...floor, perimeter: displayedPerimeter },
    scale,
    placing: active && (tool === 'door' || tool === 'window') ? tool : null,
    selectable: active && tool === 'select',
    onExitTool: exitTool,
  });

  // Furniture is only shown here; it is placed and moved in Distribución mode.
  const furniture = useFurniture({ floor, scale, active: false, selectable: false });

  const selectedId = selection?.kind === 'segment' ? selection.id : null;

  const dragHint =
    wallDrag && wallDrag.offset !== 0
      ? `Desplazamiento: ${wallDrag.offset > 0 ? '+' : ''}${wallDrag.offset} cm${previewResult && !previewResult.ok ? ' — no se puede mover tanto' : ''}`
      : null;

  return {
    tools: [
      {
        id: 'draw',
        label: '✏️ Dibujar',
        title: closed ? 'El perímetro ya está cerrado' : 'Dibujar tramos del perímetro',
        active: tool === 'draw',
        disabled: closed,
        onClick: () => setChosenTool('draw'),
      },
      {
        id: 'select',
        label: '↖ Seleccionar',
        title: 'Seleccionar y mover paredes',
        active: tool === 'select',
        onClick: () => setChosenTool('select'),
      },
      {
        id: 'door',
        label: '🚪 Puerta',
        title: 'Colocar puertas en las paredes',
        active: tool === 'door',
        onClick: () => setChosenTool('door'),
      },
      {
        id: 'window',
        label: '🪟 Ventana',
        title: 'Colocar ventanas en las paredes',
        active: tool === 'window',
        onClick: () => setChosenTool('window'),
      },
    ],
    showAngleSnap: tool === 'draw',
    toolOptions: openings.toolOptions,
    layers: (
      <>
        {layers.finishes && <FloorFinishFill floor={floor} />}
        {/* Interior shown for reference only; it is edited in Distribución mode. */}
        <ZoneLayer
          zones={layers.zones ? (layers.finishes ? zonesWithFloorColors(floor.zones) : floor.zones) : []}
          scale={scale}
          selectedId={null}
          interactive={false}
          onZonePointerDown={() => {}}
          onVertexPointerDown={() => {}}
        />
        {layers.furniture && furniture.layer}
        <PartitionLayer
          partitions={floor.partitions}
          scale={scale}
          selectedId={null}
          invalidIds={new Set(invalidPartitionIds({ ...floor, perimeter: displayedPerimeter }))}
          interactive={false}
          onPartitionPointerDown={() => {}}
          onHandlePointerDown={() => {}}
          onPartitionDoubleClick={tool === 'select' ? openElevation : undefined}
        />
        <PerimeterLayer
          perimeter={displayedPerimeter}
          scale={scale}
          selectedId={selectedId}
          interactive={tool === 'select'}
          onWallPointerDown={handleWallPointerDown}
          onLabelClick={(segmentId) => {
            select({ kind: 'segment', id: segmentId });
            requestLengthEdit(segmentId);
          }}
          onWallDoubleClick={tool === 'select' ? openElevation : undefined}
        />
        {openings.layer}
        {layers.finishes && <FinishStrips floor={{ ...floor, perimeter: displayedPerimeter }} scale={scale} />}
        {drawTool.overlay}
      </>
    ),
    hint: dragHint ?? openings.hint ?? drawTool.hint ?? SELECT_HINT,
    cursor: tool === 'select' ? 'default' : 'crosshair',
    onPointerMove: (world, shiftKey) => {
      if (openings.handlePointerMove(world)) return;
      if (wallDrag) {
        const segment = perimeter.segments.find((s) => s.id === wallDrag.segmentId);
        if (!segment) return;
        const unit = direction(segment.angle);
        const normal = { x: -unit.y, y: unit.x };
        const offset = Math.round((world.x - wallDrag.origin.x) * normal.x + (world.y - wallDrag.origin.y) * normal.y);
        if (offset !== wallDrag.offset) setWallDrag({ ...wallDrag, offset });
        return;
      }
      drawTool.handlePointerMove(world, shiftKey);
    },
    onClick: (world, onEmpty) => {
      if (tool === 'draw') drawTool.handleClick(world);
      else if (tool === 'door' || tool === 'window') openings.handleClick();
      else if (onEmpty) select(null);
    },
    onSecondaryClick: () => {
      if (tool !== 'select') setChosenTool('select');
      else select(null);
    },
  };
}

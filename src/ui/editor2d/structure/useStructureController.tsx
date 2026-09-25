import type { KonvaEventObject } from 'konva/lib/Node';
import { useEffect, useState } from 'react';
import { direction, invalidPartitionIds, isPerimeterClosed, moveSegment, type Id, type Point } from '../../../domain';
import { useProjectStore } from '../../../store/projectStore';
import type { EditorContext, EditorController } from '../controller';
import { PartitionLayer } from '../layout/PartitionLayer';
import { ZoneLayer } from '../layout/ZoneLayer';
import { PerimeterLayer } from '../PerimeterLayer';
import { useDrawTool } from '../useDrawTool';

type StructureTool = 'draw' | 'select';

interface WallDrag {
  segmentId: Id;
  origin: Point;
  offset: number;
}

const SELECT_HINT =
  'Clic en una pared para seleccionarla · arrástrala para moverla · clic en una cota para editarla · Supr para borrar · botón derecho o central para mover el plano';

/** Estructura mode: draw the perimeter, select/move/delete its walls. */
export function useStructureController({ floor, scale, angleStep, active }: EditorContext): EditorController {
  const perimeter = floor.perimeter;
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);
  const requestLengthEdit = useProjectStore((state) => state.requestLengthEdit);
  const movePerimeterSegment = useProjectStore((state) => state.movePerimeterSegment);

  const [chosenTool, setChosenTool] = useState<StructureTool>('draw');
  const [wallDrag, setWallDrag] = useState<WallDrag | null>(null);
  const closed = isPerimeterClosed(perimeter);
  const tool: StructureTool = closed ? 'select' : chosenTool;

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

  useEffect(() => {
    if (!wallDrag) return;
    const onMouseUp = () => {
      if (wallDrag.offset !== 0) movePerimeterSegment(wallDrag.segmentId, wallDrag.offset);
      setWallDrag(null);
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [wallDrag, movePerimeterSegment]);

  const handleWallPointerDown = (segmentId: Id, event: KonvaEventObject<MouseEvent>) => {
    if (event.evt.button !== 0) return;
    event.cancelBubble = true;
    const world = event.target.getStage()?.getRelativePointerPosition();
    select({ kind: 'segment', id: segmentId });
    if (world) setWallDrag({ segmentId, origin: world, offset: 0 });
  };

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
    ],
    showAngleSnap: tool === 'draw',
    layers: (
      <>
        {/* Interior shown for reference only; it is edited in Distribución mode. */}
        <ZoneLayer
          zones={floor.zones}
          scale={scale}
          selectedId={null}
          interactive={false}
          onZonePointerDown={() => {}}
          onVertexPointerDown={() => {}}
        />
        <PartitionLayer
          partitions={floor.partitions}
          scale={scale}
          selectedId={null}
          invalidIds={new Set(invalidPartitionIds({ ...floor, perimeter: displayedPerimeter }))}
          interactive={false}
          onPartitionPointerDown={() => {}}
          onHandlePointerDown={() => {}}
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
        />
        {drawTool.overlay}
      </>
    ),
    hint: dragHint ?? drawTool.hint ?? SELECT_HINT,
    cursor: tool === 'draw' ? 'crosshair' : 'default',
    onPointerMove: (world, shiftKey) => {
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
      else if (onEmpty) select(null);
    },
    onSecondaryClick: () => {
      if (tool === 'draw') setChosenTool('select');
      else select(null);
    },
  };
}

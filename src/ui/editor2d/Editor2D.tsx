import type { KonvaEventObject } from 'konva/lib/Node';
import type Konva from 'konva';
import { useEffect, useState } from 'react';
import { Layer, Stage } from 'react-konva';
import { direction, isPerimeterClosed, moveSegment, perimeterCorners, type Id, type Point } from '../../domain';
import { useProjectStore } from '../../store/projectStore';
import { useActiveFloor } from '../../store/selectors';
import { useElementSize } from '../hooks/useElementSize';
import { CANVAS_COLORS } from './colors';
import { Grid } from './Grid';
import { PerimeterLayer } from './PerimeterLayer';
import { useDrawTool } from './useDrawTool';
import { ANGLE_STEPS, type AngleStep } from './snap';
import { fitPoints, zoomAt, type Viewport } from './viewport';

type Tool = 'draw' | 'select';

interface WallDrag {
  segmentId: Id;
  origin: Point;
  offset: number;
}

const ZOOM_STEP = 1.1;

function worldPointer(stage: Konva.Stage | null): Point | null {
  return stage?.getRelativePointerPosition() ?? null;
}

export function Editor2D() {
  const floor = useActiveFloor();
  const perimeter = floor.perimeter;
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);
  const requestLengthEdit = useProjectStore((state) => state.requestLengthEdit);
  const movePerimeterSegment = useProjectStore((state) => state.movePerimeterSegment);

  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [chosenTool, setChosenTool] = useState<Tool>('draw');
  const [wallDrag, setWallDrag] = useState<WallDrag | null>(null);
  const [angleStep, setAngleStep] = useState<AngleStep>(90);

  const closed = isPerimeterClosed(perimeter);
  const tool: Tool = closed ? 'select' : chosenTool;
  const effectiveViewport = viewport ?? fitPoints(perimeterCorners(perimeter), width, height);

  const drawTool = useDrawTool({
    enabled: tool === 'draw',
    perimeter,
    scale: effectiveViewport.scale,
    angleStep,
    onExit: () => setChosenTool('select'),
  });

  // Live preview while dragging a wall; the store is only updated on release (one undo step).
  const previewResult = wallDrag && wallDrag.offset !== 0 ? moveSegment(perimeter, wallDrag.segmentId, wallDrag.offset) : null;
  const displayedPerimeter = previewResult?.ok ? previewResult.value : perimeter;

  const finishWallDrag = () => {
    if (!wallDrag) return;
    if (wallDrag.offset !== 0) movePerimeterSegment(wallDrag.segmentId, wallDrag.offset);
    setWallDrag(null);
  };

  useEffect(() => {
    if (!wallDrag) return;
    const onMouseUp = () => finishWallDrag();
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  });

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const pointer = event.target.getStage()?.getPointerPosition();
    if (!pointer) return;
    const factor = event.evt.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
    setViewport(zoomAt(effectiveViewport, pointer, factor));
  };

  const handleStageDrag = (event: KonvaEventObject<DragEvent>) => {
    const stage = event.target;
    if (stage !== stage.getStage()) return;
    setViewport({ ...effectiveViewport, x: stage.x(), y: stage.y() });
  };

  const handleMouseMove = (event: KonvaEventObject<MouseEvent>) => {
    const world = worldPointer(event.target.getStage());
    if (!world) return;
    if (wallDrag) {
      const segment = perimeter.segments.find((s) => s.id === wallDrag.segmentId);
      if (!segment) return;
      const unit = direction(segment.angle);
      const normal = { x: -unit.y, y: unit.x };
      const offset = Math.round((world.x - wallDrag.origin.x) * normal.x + (world.y - wallDrag.origin.y) * normal.y);
      if (offset !== wallDrag.offset) setWallDrag({ ...wallDrag, offset });
      return;
    }
    drawTool.handlePointerMove(world, event.evt.shiftKey);
  };

  const handleStageClick = (event: KonvaEventObject<MouseEvent>) => {
    if (event.evt.button !== 0) return;
    const stage = event.target.getStage();
    const world = worldPointer(stage);
    if (!world) return;
    if (tool === 'draw') {
      drawTool.handleClick(world);
    } else if (event.target === stage) {
      select(null);
    }
  };

  const handleWallPointerDown = (segmentId: Id, event: KonvaEventObject<MouseEvent>) => {
    if (event.evt.button !== 0) return;
    event.cancelBubble = true;
    const stage = event.target.getStage();
    stage?.stopDrag();
    const world = worldPointer(stage);
    select({ kind: 'segment', id: segmentId });
    if (world) setWallDrag({ segmentId, origin: world, offset: 0 });
  };

  const handleLabelClick = (segmentId: Id) => {
    select({ kind: 'segment', id: segmentId });
    requestLengthEdit(segmentId);
  };

  const selectedId = selection?.kind === 'segment' ? selection.id : null;

  return (
    <div className="editor2d" ref={ref} style={{ background: CANVAS_COLORS.background }}>
      {width > 0 && height > 0 && (
        <Stage
          width={width}
          height={height}
          scaleX={effectiveViewport.scale}
          scaleY={effectiveViewport.scale}
          x={effectiveViewport.x}
          y={effectiveViewport.y}
          draggable={!wallDrag}
          onWheel={handleWheel}
          onDragMove={handleStageDrag}
          onDragEnd={handleStageDrag}
          onMouseMove={handleMouseMove}
          onMouseLeave={drawTool.clearPointer}
          onClick={handleStageClick}
          style={{ cursor: tool === 'draw' ? 'crosshair' : 'default' }}
        >
          <Layer>
            <Grid viewport={effectiveViewport} width={width} height={height} />
            <PerimeterLayer
              perimeter={displayedPerimeter}
              scale={effectiveViewport.scale}
              selectedId={selectedId}
              interactive={tool === 'select'}
              onWallPointerDown={handleWallPointerDown}
              onLabelClick={handleLabelClick}
            />
            {drawTool.overlay}
          </Layer>
        </Stage>
      )}

      <div className="editor2d__toolbar">
        <button
          className={tool === 'draw' ? 'is-active' : ''}
          disabled={closed}
          onClick={() => setChosenTool('draw')}
          title={closed ? 'El perímetro ya está cerrado' : 'Dibujar tramos'}
        >
          ✏️ Dibujar
        </button>
        <button className={tool === 'select' ? 'is-active' : ''} onClick={() => setChosenTool('select')}>
          ↖ Seleccionar
        </button>
        <button onClick={() => setViewport(fitPoints(perimeterCorners(perimeter), width, height))}>⤢ Encuadrar</button>
        {tool === 'draw' && (
          <div className="segmented" role="group" aria-label="Ajuste de ángulo" title="Ajuste de ángulo al dibujar (Shift = libre)">
            {ANGLE_STEPS.map((step) => (
              <button key={step} className={angleStep === step ? 'is-active' : ''} onClick={() => setAngleStep(step)}>
                {step === 0 ? 'Libre' : `${step}°`}
              </button>
            ))}
          </div>
        )}
      </div>

      {wallDrag && wallDrag.offset !== 0 && (
        <div className="editor2d__hint">
          Desplazamiento: {wallDrag.offset > 0 ? '+' : ''}
          {wallDrag.offset} cm {previewResult && !previewResult.ok && '— no se puede mover tanto'}
        </div>
      )}
      {!wallDrag && (drawTool.hint || tool === 'select') && (
        <div className="editor2d__hint">
          {drawTool.hint ??
            'Clic en una pared para seleccionarla · arrástrala para moverla · clic en una cota para editarla · Supr para borrar'}
        </div>
      )}
    </div>
  );
}

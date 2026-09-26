import type { KonvaEventObject } from 'konva/lib/Node';
import { useEffect, useEffectEvent, useState } from 'react';
import { Layer, Stage } from 'react-konva';
import { perimeterCorners, type Point } from '../../domain';
import { useProjectStore } from '../../store/projectStore';
import { useActiveFloor } from '../../store/selectors';
import { useVisibleLayers } from '../../store/viewStore';
import { LayerToggles } from '../components/LayerToggles';
import { useElementSize } from '../hooks/useElementSize';
import { useIsCompact, useIsTouchScreen } from '../hooks/useMediaQuery';
import { CANVAS_COLORS } from './colors';
import { Grid } from './Grid';
import { useFinishesController } from './finishes/useFinishesController';
import { useFurnishController } from './furnish/useFurnishController';
import { useLayoutController } from './layout/useLayoutController';
import { ElevationView } from '../openings/ElevationView';
import { ANGLE_STEPS, type AngleStep } from './snap';
import { useStructureController } from './structure/useStructureController';
import { TouchActions } from './TouchActions';
import { PLAN_STAGE_CLASS, useTouchInput } from './useTouchInput';
import { fitPoints, zoomAt, type Viewport } from './viewport';

const ZOOM_STEP = 1.1;
const PAN_BUTTON_MIDDLE = 1;
const PAN_BUTTON_RIGHT = 2;

interface Pan {
  start: Point;
  viewport: Viewport;
  button: number;
  /** Set once the pointer travels far enough to count as a drag rather than a click. */
  moved: boolean;
}

const CLICK_MAX_TRAVEL_PX = 4;

/**
 * 2D plan canvas: owns zoom, pan and the grid, and forwards pointer input to the controller
 * of the active mode. Mouse: left button draws/selects, right or middle button pans, wheel zooms.
 * Fingers: one finger works like the left button, two fingers pan and zoom.
 */
export function Editor2D() {
  const floor = useActiveFloor();
  const mode = useProjectStore((state) => state.mode);
  const elevationOpen = useProjectStore((state) => state.elevationWallId !== null);
  const placingFurniture = useProjectStore((state) => state.placingFurniture !== null);
  const touchScreen = useIsTouchScreen();
  const compact = useIsCompact();
  const showTouchActions = touchScreen || compact;

  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [pan, setPan] = useState<Pan | null>(null);
  const [angleStep, setAngleStep] = useState<AngleStep>(90);

  const effectiveViewport = viewport ?? fitPoints(perimeterCorners(floor.perimeter), width, height);
  const layers = useVisibleLayers('plan', mode);
  const context = { floor, scale: effectiveViewport.scale, angleStep, layers };
  const structure = useStructureController({ ...context, active: mode === 'structure' });
  const layout = useLayoutController({ ...context, active: mode === 'layout' });
  const furnish = useFurnishController({ ...context, active: mode === 'furnish' });
  const finishes = useFinishesController({ ...context, active: mode === 'finishes' });
  const controllers = { structure, layout, furnish, finishes };
  const controller = controllers[mode];

  const touch = useTouchInput(ref, {
    viewport: effectiveViewport,
    setViewport,
    onMove: (world) => controller.onPointerMove(world, false),
    onRelease: (world, onEmpty) => controller.onClick(world, onEmpty),
  });

  const handleWheel = (event: KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const pointer = event.target.getStage()?.getPointerPosition();
    if (!pointer) return;
    const factor = event.evt.deltaY > 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
    setViewport(zoomAt(effectiveViewport, pointer, factor));
  };

  // Panning uses the right or middle button so the left button is only for drawing and selecting.
  const handlePointerDown = (event: KonvaEventObject<PointerEvent>) => {
    if (event.evt.pointerType === 'touch') {
      // Reaches the stage only when no shape stopped it: the finger touched an empty spot.
      if (event.target === event.target.getStage()) touch.markTouchedEmpty();
      return;
    }
    if (event.evt.button !== PAN_BUTTON_MIDDLE && event.evt.button !== PAN_BUTTON_RIGHT) return;
    event.evt.preventDefault();
    setPan({
      start: { x: event.evt.clientX, y: event.evt.clientY },
      viewport: effectiveViewport,
      button: event.evt.button,
      moved: false,
    });
  };

  // Latest controller without re-subscribing the pan listeners on every render.
  const secondaryClick = useEffectEvent(() => controller.onSecondaryClick());

  useEffect(() => {
    if (!pan) return;
    const onMouseMove = (event: MouseEvent) => {
      const dx = event.clientX - pan.start.x;
      const dy = event.clientY - pan.start.y;
      if (!pan.moved && Math.hypot(dx, dy) < CLICK_MAX_TRAVEL_PX) return;
      if (!pan.moved) setPan({ ...pan, moved: true });
      setViewport({ ...pan.viewport, x: pan.viewport.x + dx, y: pan.viewport.y + dy });
    };
    const onMouseUp = () => {
      // A right click that did not drag the plan means "finish / leave the tool".
      if (!pan.moved && pan.button === PAN_BUTTON_RIGHT) secondaryClick();
      setPan(null);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [pan]);

  // Fingers are handled by useTouchInput.
  const handlePointerMove = (event: KonvaEventObject<PointerEvent>) => {
    if (event.evt.pointerType === 'touch') return;
    const world = event.target.getStage()?.getRelativePointerPosition();
    if (world) controller.onPointerMove(world, event.evt.shiftKey);
  };

  const handleClick = (event: KonvaEventObject<MouseEvent>) => {
    // Browsers emulate a click after a tap: the tap was already handled as a finger release.
    if (event.evt.button !== 0 || touch.wasRecentTouch()) return;
    const stage = event.target.getStage();
    const world = stage?.getRelativePointerPosition();
    if (world) controller.onClick(world, event.target === stage);
  };

  return (
    <div className="editor2d" ref={ref} style={{ background: CANVAS_COLORS.background }}>
      {width > 0 && height > 0 && (
        <Stage
          className={PLAN_STAGE_CLASS}
          width={width}
          height={height}
          scaleX={effectiveViewport.scale}
          scaleY={effectiveViewport.scale}
          x={effectiveViewport.x}
          y={effectiveViewport.y}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onClick={handleClick}
          onContextMenu={(event) => event.evt.preventDefault()}
          style={{ cursor: pan?.moved ? 'grabbing' : controller.cursor }}
        >
          <Layer>
            <Grid viewport={effectiveViewport} width={width} height={height} />
            {controller.layers}
          </Layer>
        </Stage>
      )}

      <div className="editor2d__toolbar">
        {controller.tools.map((tool) => (
          <button
            key={tool.id}
            className={tool.active ? 'is-active' : ''}
            disabled={tool.disabled}
            title={tool.title}
            onClick={tool.onClick}
          >
            {tool.label}
          </button>
        ))}
        <button onClick={() => setViewport(fitPoints(perimeterCorners(floor.perimeter), width, height))}>
          ⤢ Encuadrar
        </button>
        {controller.toolOptions}
        {controller.showAngleSnap && (
          <div className="segmented" role="group" aria-label="Ajuste de ángulo" title="Ajuste de ángulo al dibujar (Shift = libre)">
            {ANGLE_STEPS.map((step) => (
              <button key={step} className={angleStep === step ? 'is-active' : ''} onClick={() => setAngleStep(step)}>
                {step === 0 ? 'Libre' : `${step}°`}
              </button>
            ))}
          </div>
        )}
      </div>

      {controller.hint && <div className="editor2d__hint">{controller.hint}</div>}
      {showTouchActions && (
        <TouchActions
          toolActive={placingFurniture || controller.tools.some((tool) => tool.active && tool.id !== 'select')}
          onFinish={controller.onSecondaryClick}
          lengthEntry={controller.lengthEntry}
        />
      )}
      <LayerToggles view="plan" />
      {elevationOpen && <ElevationView />}
    </div>
  );
}

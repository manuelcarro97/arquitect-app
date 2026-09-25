import { useEffect, useState } from 'react';
import { Circle, Group, Line, Text } from 'react-konva';
import { distance, perimeterCorners, type Perimeter, type Point } from '../../domain';
import { useProjectStore } from '../../store/projectStore';
import { formatCm, formatDegrees } from '../format';
import { CANVAS_COLORS } from './colors';
import { computeDrawPreview, LENGTH_STEP_CM, snapPointToGrid } from './snap';

const CLOSE_SNAP_PX = 14;
const LABEL_FONT_PX = 13;

interface DrawToolOptions {
  enabled: boolean;
  perimeter: Perimeter;
  scale: number;
  onExit: () => void;
}

function isTypingInForm(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

/**
 * Perimeter drawing tool: first click places the start, each click adds a segment,
 * typing a number + Enter fixes the exact length, clicking the start closes the perimeter.
 */
export function useDrawTool({ enabled, perimeter, scale, onExit }: DrawToolOptions) {
  const appendSegment = useProjectStore((state) => state.appendPerimeterSegment);
  const closePerimeter = useProjectStore((state) => state.closePerimeter);
  const setStart = useProjectStore((state) => state.setPerimeterStart);

  const [pointer, setPointer] = useState<Point | null>(null);
  const [freeAngle, setFreeAngle] = useState(false);
  const [typed, setTyped] = useState('');
  const [startPlaced, setStartPlaced] = useState(perimeter.segments.length > 0);

  const corners = perimeterCorners(perimeter);
  const last = corners[corners.length - 1];
  const awaitingStart = perimeter.segments.length === 0 && !startPlaced;
  const typedLength = typed === '' ? null : Number(typed.replace(',', '.'));
  const snapsToStart =
    !awaitingStart &&
    perimeter.segments.length >= 2 &&
    pointer !== null &&
    distance(pointer, perimeter.start) <= CLOSE_SNAP_PX / scale;
  const preview =
    enabled && !awaitingStart && pointer && !snapsToStart
      ? computeDrawPreview(last, pointer, { freeAngle, typedLength: Number.isFinite(typedLength) ? typedLength : null })
      : null;

  const commit = () => {
    if (snapsToStart) {
      closePerimeter();
      setTyped('');
      return;
    }
    if (preview && appendSegment({ length: preview.length, angle: preview.angle })) {
      setTyped('');
    }
  };

  const handleClick = (world: Point) => {
    if (!enabled) return;
    if (awaitingStart) {
      setStart(snapPointToGrid(world, LENGTH_STEP_CM));
      setStartPlaced(true);
      return;
    }
    commit();
  };

  const handlePointerMove = (world: Point, shiftKey: boolean) => {
    setPointer(world);
    setFreeAngle(shiftKey);
  };

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingInForm(event.target)) return;
      if (/^[0-9]$/.test(event.key) || ((event.key === ',' || event.key === '.') && !typed.includes(','))) {
        setTyped((value) => value + (event.key === '.' ? ',' : event.key));
      } else if (event.key === 'Backspace' && typed !== '') {
        setTyped((value) => value.slice(0, -1));
      } else if (event.key === 'Enter') {
        commit();
      } else if (event.key === 'Escape') {
        if (typed !== '') setTyped('');
        else onExit();
      } else {
        return;
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const fontSize = LABEL_FONT_PX / scale;
  const overlay = enabled ? (
    <Group listening={false}>
      {awaitingStart && pointer && (
        <Circle
          x={snapPointToGrid(pointer, LENGTH_STEP_CM).x}
          y={snapPointToGrid(pointer, LENGTH_STEP_CM).y}
          radius={5 / scale}
          fill={CANVAS_COLORS.start}
          opacity={0.6}
        />
      )}
      {snapsToStart && (
        <>
          <Line
            points={[last.x, last.y, perimeter.start.x, perimeter.start.y]}
            stroke={CANVAS_COLORS.start}
            strokeWidth={3 / scale}
            dash={[8 / scale, 6 / scale]}
          />
          <Circle x={perimeter.start.x} y={perimeter.start.y} radius={9 / scale} stroke={CANVAS_COLORS.start} strokeWidth={2 / scale} />
        </>
      )}
      {preview && (
        <>
          <Line
            points={[preview.from.x, preview.from.y, preview.to.x, preview.to.y]}
            stroke={CANVAS_COLORS.preview}
            strokeWidth={3 / scale}
            dash={[8 / scale, 6 / scale]}
          />
          <Text
            x={preview.to.x + 10 / scale}
            y={preview.to.y + 10 / scale}
            text={`${typed !== '' ? '⌨ ' : ''}${formatCm(preview.length)} · ${formatDegrees(preview.angle)}`}
            fontSize={fontSize}
            fontStyle="bold"
            fill={CANVAS_COLORS.preview}
          />
        </>
      )}
    </Group>
  ) : null;

  const hint = !enabled
    ? null
    : awaitingStart
      ? 'Haz clic para colocar la primera esquina.'
      : snapsToStart
        ? 'Clic para cerrar el perímetro.'
        : typed !== ''
          ? `Longitud tecleada: ${typed} cm — Enter para confirmar, Esc para borrar.`
          : 'Clic para añadir tramo · teclea la medida + Enter · Shift = ángulo libre · Esc = seleccionar';

  return { overlay, hint, handleClick, handlePointerMove, clearPointer: () => setPointer(null) };
}

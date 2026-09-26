import { useEffect, useState } from 'react';
import { Circle, Group, Line, Text } from 'react-konva';
import type { Floor, Point } from '../../../domain';
import { useProjectStore } from '../../../store/projectStore';
import { formatCm, formatDegrees } from '../../format';
import { CANVAS_COLORS } from '../colors';
import { isTypingInForm, sanitizeTypedLength, type LengthEntry } from '../controller';
import { snapLengthToWalls, snapPoint, snapTargetsFor } from '../pointSnap';
import { alignWithCorners, computeDrawPreview, LENGTH_STEP_CM, type AngleStep } from '../snap';
import { SnapMarker } from './SnapMarker';

const SNAP_PX = 10;
const LABEL_FONT_PX = 13;
const PREVIEW_THICKNESS_CM = 10;

interface PartitionToolOptions {
  enabled: boolean;
  floor: Floor;
  scale: number;
  angleStep: AngleStep;
  onExit: () => void;
}

/**
 * Draws partitions: click the start (anywhere, it sticks to corners and to any point along a wall),
 * click the end. Consecutive partitions chain from the last end until Esc.
 */
export function usePartitionTool({ enabled, floor, scale, angleStep, onExit }: PartitionToolOptions) {
  const addPartition = useProjectStore((state) => state.addPartition);
  const [start, setStart] = useState<Point | null>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [freeAngle, setFreeAngle] = useState(false);
  const [typed, setTyped] = useState('');

  const tolerance = SNAP_PX / scale;
  const targets = snapTargetsFor(floor);
  const typedLength = typed === '' ? null : Number(typed.replace(',', '.'));
  const validTypedLength = typedLength !== null && Number.isFinite(typedLength) ? typedLength : null;

  const startCandidate = enabled && !start && pointer ? snapPoint(pointer, targets, tolerance, LENGTH_STEP_CM) : null;

  let preview: { to: Point; length: number; angle: number } | null = null;
  let guides: { from: Point; to: Point }[] = [];
  let endSnappedToWall = false;
  if (enabled && start && pointer) {
    const raw = computeDrawPreview(start, pointer, {
      angleStep: freeAngle ? 0 : angleStep,
      typedLength: validTypedLength,
    });
    if (raw) {
      if (validTypedLength !== null) {
        preview = raw;
      } else {
        // Reaching a wall wins; otherwise line up with existing corners.
        const toWall = snapLengthToWalls(start, raw.angle, raw.length, targets.segments, tolerance);
        if (toWall.snapped) {
          preview = { to: toWall.end, length: toWall.length, angle: raw.angle };
          endSnappedToWall = true;
        } else {
          const aligned = alignWithCorners(raw, targets.points, { tolerance, snap: true });
          preview = aligned.preview;
          guides = aligned.guides;
        }
      }
    }
  }

  const commit = () => {
    if (!start || !preview) return;
    if (addPartition(start, preview.to)) {
      setStart(preview.to);
      setTyped('');
    }
  };

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingInForm(event.target)) return;
      if (start && (/^[0-9]$/.test(event.key) || ((event.key === ',' || event.key === '.') && !typed.includes(',')))) {
        setTyped((value) => value + (event.key === '.' ? ',' : event.key));
      } else if (event.key === 'Backspace' && typed !== '') {
        setTyped((value) => value.slice(0, -1));
      } else if (event.key === 'Enter') {
        commit();
      } else if (event.key === 'Escape') {
        if (typed !== '') setTyped('');
        else if (start) setStart(null);
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
      {startCandidate && <SnapMarker point={startCandidate.point} kind={startCandidate.kind} scale={scale} />}
      {startCandidate && startCandidate.kind === 'grid' && (
        <Circle x={startCandidate.point.x} y={startCandidate.point.y} radius={4 / scale} fill={CANVAS_COLORS.preview} />
      )}
      {start && <Circle x={start.x} y={start.y} radius={5 / scale} fill={CANVAS_COLORS.preview} />}
      {guides.map((guide, i) => (
        <Line
          key={i}
          points={[guide.from.x, guide.from.y, guide.to.x, guide.to.y]}
          stroke={CANVAS_COLORS.guide}
          strokeWidth={1 / scale}
          dash={[4 / scale, 4 / scale]}
        />
      ))}
      {start && preview && (
        <>
          <Line
            points={[start.x, start.y, preview.to.x, preview.to.y]}
            stroke={CANVAS_COLORS.preview}
            strokeWidth={PREVIEW_THICKNESS_CM}
            opacity={0.45}
          />
          {endSnappedToWall && <SnapMarker point={preview.to} kind="segment" scale={scale} />}
          <Text
            x={preview.to.x + 10 / scale}
            y={preview.to.y + 10 / scale}
            text={`${typed !== '' ? '⌨ ' : ''}${formatCm(Math.round(preview.length * 10) / 10)} · ${formatDegrees(preview.angle)}`}
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
    : !start
      ? 'Clic donde empieza el tabique (se engancha a esquinas y a cualquier punto de una pared) · Esc o clic derecho = seleccionar'
      : typed !== ''
        ? `Longitud tecleada: ${typed} cm — Enter para confirmar, Esc para borrar.`
        : 'Clic donde acaba el tabique · teclea la medida + Enter · Shift = ángulo libre · Esc o clic derecho = terminar';

  const lengthEntry: LengthEntry | undefined =
    enabled && start ? { value: typed, onChange: (value) => setTyped(sanitizeTypedLength(value)), onSubmit: commit } : undefined;

  const readout =
    enabled && start && preview
      ? `${formatCm(Math.round(preview.length * 10) / 10)} · ${formatDegrees(preview.angle)}`
      : undefined;

  return {
    overlay,
    hint,
    readout,
    lengthEntry,
    handlePointerMove: (world: Point, shiftKey: boolean) => {
      setPointer(world);
      setFreeAngle(shiftKey);
    },
    handleClick: () => {
      if (!enabled) return;
      if (!start) {
        if (startCandidate) setStart(startCandidate.point);
        return;
      }
      commit();
    },
    /** Right click: end the current chain of partitions, or leave the tool if none is in progress. */
    handleSecondaryClick: () => {
      if (!enabled) return;
      if (start) {
        setStart(null);
        setTyped('');
      } else {
        onExit();
      }
    },
    reset: () => {
      setStart(null);
      setTyped('');
    },
  };
}

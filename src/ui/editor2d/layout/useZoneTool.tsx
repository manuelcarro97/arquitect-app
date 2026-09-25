import { useEffect, useState } from 'react';
import { Circle, Group, Line } from 'react-konva';
import { distance, type Floor, type Point } from '../../../domain';
import { useProjectStore } from '../../../store/projectStore';
import { ZONE_PALETTE } from '../colors';
import { isTypingInForm } from '../controller';
import { snapPoint, snapTargetsFor } from '../pointSnap';
import { LENGTH_STEP_CM } from '../snap';
import { SnapMarker } from './SnapMarker';

const SNAP_PX = 10;

interface ZoneToolOptions {
  enabled: boolean;
  floor: Floor;
  scale: number;
  onExit: () => void;
}

/** Draws a zone polygon point by point; closes on the first point or with Enter. */
export function useZoneTool({ enabled, floor, scale, onExit }: ZoneToolOptions) {
  const addZone = useProjectStore((state) => state.addZone);
  const [points, setPoints] = useState<Point[]>([]);
  const [pointer, setPointer] = useState<Point | null>(null);

  const tolerance = SNAP_PX / scale;
  const baseTargets = snapTargetsFor(floor);
  const targets = { ...baseTargets, points: [...baseTargets.points, ...floor.zones.flatMap((zone) => zone.points)] };
  const closing = points.length >= 3 && pointer !== null && distance(pointer, points[0]) <= tolerance;
  const candidate = enabled && pointer && !closing ? snapPoint(pointer, targets, tolerance, LENGTH_STEP_CM) : null;
  const color = ZONE_PALETTE[floor.zones.length % ZONE_PALETTE.length];

  const finish = () => {
    if (points.length < 3) return;
    if (addZone({ name: `Zona ${floor.zones.length + 1}`, color, points })) {
      setPoints([]);
      onExit();
    }
  };

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingInForm(event.target)) return;
      if (event.key === 'Enter') finish();
      else if (event.key === 'Backspace' && points.length > 0) setPoints((current) => current.slice(0, -1));
      else if (event.key === 'Escape') {
        if (points.length > 0) setPoints([]);
        else onExit();
      } else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const next = closing ? points[0] : candidate?.point;
  const outline = next ? [...points, next] : points;

  const overlay = enabled ? (
    <Group listening={false}>
      {outline.length >= 2 && (
        <Line
          points={outline.flatMap((p) => [p.x, p.y])}
          closed={outline.length >= 3}
          fill={color}
          opacity={0.4}
          stroke={color}
          strokeWidth={2 / scale}
          dash={[6 / scale, 4 / scale]}
        />
      )}
      {points.map((point, i) => (
        <Circle key={i} x={point.x} y={point.y} radius={(i === 0 ? 6 : 4) / scale} fill={color} />
      ))}
      {closing && <Circle x={points[0].x} y={points[0].y} radius={10 / scale} stroke={color} strokeWidth={2 / scale} />}
      {candidate && <SnapMarker point={candidate.point} kind={candidate.kind} scale={scale} />}
    </Group>
  ) : null;

  const hint = !enabled
    ? null
    : points.length === 0
      ? 'Clic en cada esquina de la zona (se engancha a esquinas y paredes) · Esc o clic derecho = seleccionar'
      : closing
        ? 'Clic para cerrar la zona.'
        : 'Clic para añadir punto · clic en el primero o Enter para cerrar · Retroceso = quitar último · clic derecho = cerrar · Esc = cancelar';

  return {
    overlay,
    hint,
    handlePointerMove: (world: Point) => setPointer(world),
    handleClick: () => {
      if (!enabled) return;
      if (closing) finish();
      else if (candidate) setPoints((current) => [...current, candidate.point]);
    },
    /** Right click: close the zone if it has 3+ points, otherwise cancel it, or leave the tool. */
    handleSecondaryClick: () => {
      if (!enabled) return;
      if (points.length >= 3) finish();
      else if (points.length > 0) setPoints([]);
      else onExit();
    },
    reset: () => setPoints([]),
  };
}

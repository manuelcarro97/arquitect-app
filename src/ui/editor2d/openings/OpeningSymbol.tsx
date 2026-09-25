import type { KonvaEventObject } from 'konva/lib/Node';
import { Group, Line, Rect } from 'react-konva';
import { angleBetween, openingFrame, type Opening, type Point, type WallGeometry } from '../../../domain';
import { CANVAS_COLORS } from '../colors';
import { setStageCursor } from '../labels';

interface OpeningSymbolProps {
  wall: WallGeometry;
  opening: Opening;
  scale: number;
  color: string;
  opacity?: number;
  interactive: boolean;
  onPointerDown?: (event: KonvaEventObject<MouseEvent>) => void;
}

const ARC_STEPS = 16;

/** Quarter circle from the open leaf tip to the latch jamb, around the hinge. */
function swingArc(hinge: Point, from: Point, to: Point): number[] {
  const radius = Math.hypot(from.x - hinge.x, from.y - hinge.y);
  const start = Math.atan2(from.y - hinge.y, from.x - hinge.x);
  let sweep = Math.atan2(to.y - hinge.y, to.x - hinge.x) - start;
  if (sweep > Math.PI) sweep -= 2 * Math.PI;
  if (sweep < -Math.PI) sweep += 2 * Math.PI;
  const points: number[] = [];
  for (let i = 0; i <= ARC_STEPS; i++) {
    const angle = start + (sweep * i) / ARC_STEPS;
    points.push(hinge.x + Math.cos(angle) * radius, hinge.y + Math.sin(angle) * radius);
  }
  return points;
}

/** Standard plan symbol: a gap in the wall plus a door leaf with its swing arc, or a double-line window. */
export function OpeningSymbol({ wall, opening, scale, color, opacity = 1, interactive, onPointerDown }: OpeningSymbolProps) {
  const frame = openingFrame(wall, opening);
  const angle = angleBetween(wall.start, wall.end);
  const line = 1.5 / scale;
  const half = wall.thickness / 2;
  const offsetLine = (distance: number) => [
    frame.start.x + frame.normal.x * distance,
    frame.start.y + frame.normal.y * distance,
    frame.end.x + frame.normal.x * distance,
    frame.end.y + frame.normal.y * distance,
  ];

  return (
    <Group opacity={opacity}>
      {/* Gap in the wall; also the grab area to select and drag the opening. */}
      <Rect
        x={frame.center.x}
        y={frame.center.y}
        width={opening.width}
        height={wall.thickness + 2 / scale}
        offsetX={opening.width / 2}
        offsetY={(wall.thickness + 2 / scale) / 2}
        rotation={angle}
        fill={CANVAS_COLORS.background}
        stroke={color}
        strokeWidth={line}
        listening={interactive}
        onMouseDown={onPointerDown}
        onMouseEnter={(event) => setStageCursor(event.target, 'ew-resize')}
        onMouseLeave={(event) => setStageCursor(event.target, '')}
      />
      {opening.type === 'door' ? (
        <>
          <Line
            points={[frame.hinge.x, frame.hinge.y, frame.openLeafTip.x, frame.openLeafTip.y]}
            stroke={color}
            strokeWidth={2 * line}
            listening={false}
          />
          <Line
            points={swingArc(frame.hinge, frame.openLeafTip, frame.latch)}
            stroke={color}
            strokeWidth={line}
            dash={[4 / scale, 3 / scale]}
            listening={false}
          />
        </>
      ) : (
        <>
          <Line points={offsetLine(-half / 3)} stroke={color} strokeWidth={line} listening={false} />
          <Line points={offsetLine(half / 3)} stroke={color} strokeWidth={line} listening={false} />
        </>
      )}
    </Group>
  );
}

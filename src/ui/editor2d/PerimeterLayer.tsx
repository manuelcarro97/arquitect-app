import type { KonvaEventObject } from 'konva/lib/Node';
import { Circle, Group, Line, Text } from 'react-konva';
import {
  CLOSURE_TOLERANCE_CM,
  closureGap,
  direction,
  perimeterCorners,
  type Id,
  type Perimeter,
  type Point,
} from '../../domain';
import { formatCm } from '../format';
import { CANVAS_COLORS } from './colors';

interface PerimeterLayerProps {
  perimeter: Perimeter;
  scale: number;
  selectedId: Id | null;
  interactive: boolean;
  onWallPointerDown: (segmentId: Id, event: KonvaEventObject<MouseEvent>) => void;
  onLabelClick: (segmentId: Id) => void;
}

const LABEL_FONT_PX = 12;
const LABEL_WIDTH_PX = 90;
const MIN_HIT_PX = 14;

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function PerimeterLayer({
  perimeter,
  scale,
  selectedId,
  interactive,
  onWallPointerDown,
  onLabelClick,
}: PerimeterLayerProps) {
  const corners = perimeterCorners(perimeter);
  const gap = closureGap(perimeter);
  const last = corners[corners.length - 1];
  const fontSize = LABEL_FONT_PX / scale;
  const labelWidth = LABEL_WIDTH_PX / scale;

  return (
    <Group>
      {perimeter.segments.map((segment, i) => {
        const start = corners[i];
        const end = corners[i + 1];
        const selected = segment.id === selectedId;
        const unit = direction(segment.angle);
        // Normal (-dir.y, dir.x) points inwards for clockwise drawings; labels go on the other side.
        const outward = { x: unit.y, y: -unit.x };
        const labelDistance = segment.thickness / 2 + 14 / scale;
        const center = midpoint(start, end);
        const labelPosition = { x: center.x + outward.x * labelDistance, y: center.y + outward.y * labelDistance };
        const color = selected ? CANVAS_COLORS.wallSelected : CANVAS_COLORS.wall;
        return (
          <Group key={segment.id}>
            <Line
              points={[start.x, start.y, end.x, end.y]}
              stroke={color}
              strokeWidth={segment.thickness}
              lineCap="square"
              hitStrokeWidth={Math.max(segment.thickness, MIN_HIT_PX / scale)}
              listening={interactive}
              onMouseDown={(event) => onWallPointerDown(segment.id, event)}
              onMouseEnter={(event) => {
                const container = event.target.getStage()?.container();
                if (container) container.style.cursor = 'move';
              }}
              onMouseLeave={(event) => {
                const container = event.target.getStage()?.container();
                if (container) container.style.cursor = '';
              }}
            />
            <Text
              x={labelPosition.x}
              y={labelPosition.y}
              width={labelWidth}
              offsetX={labelWidth / 2}
              offsetY={fontSize / 2}
              align="center"
              text={formatCm(Math.round(segment.length * 10) / 10)}
              fontSize={fontSize}
              fontStyle={selected ? 'bold' : 'normal'}
              fill={selected ? CANVAS_COLORS.labelSelected : CANVAS_COLORS.label}
              onClick={() => onLabelClick(segment.id)}
              onMouseEnter={(event) => {
                const container = event.target.getStage()?.container();
                if (container) container.style.cursor = 'text';
              }}
              onMouseLeave={(event) => {
                const container = event.target.getStage()?.container();
                if (container) container.style.cursor = '';
              }}
            />
          </Group>
        );
      })}

      {perimeter.segments.length >= 2 && gap > CLOSURE_TOLERANCE_CM && (
        <Group listening={false}>
          <Line
            points={[last.x, last.y, perimeter.start.x, perimeter.start.y]}
            stroke={CANVAS_COLORS.gap}
            strokeWidth={2 / scale}
            dash={[8 / scale, 6 / scale]}
          />
          <Text
            x={midpoint(last, perimeter.start).x}
            y={midpoint(last, perimeter.start).y}
            text={`no cierra: ${formatCm(Math.round(gap * 10) / 10)}`}
            fontSize={fontSize}
            fill={CANVAS_COLORS.gap}
            offsetY={-fontSize}
          />
        </Group>
      )}

      <Group listening={false}>
        {corners.map((corner, i) => (
          <Circle
            key={i}
            x={corner.x}
            y={corner.y}
            radius={(i === 0 ? 5 : 3) / scale}
            fill={i === 0 ? CANVAS_COLORS.start : CANVAS_COLORS.corner}
          />
        ))}
      </Group>
    </Group>
  );
}

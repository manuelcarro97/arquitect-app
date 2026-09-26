import type { KonvaEventObject } from 'konva/lib/Node';
import { Circle, Group, Line, Text } from 'react-konva';
import { angleBetween, direction, distance, type Id, type Partition } from '../../../domain';
import { formatCm } from '../../format';
import { CANVAS_COLORS } from '../colors';
import { midpoint, readableRotation, setStageCursor } from '../labels';

export type PartitionEnd = 'a' | 'b';

interface PartitionLayerProps {
  partitions: Partition[];
  scale: number;
  selectedId: Id | null;
  invalidIds: Set<Id>;
  interactive: boolean;
  onPartitionPointerDown: (partitionId: Id, event: KonvaEventObject<PointerEvent>) => void;
  onHandlePointerDown: (partitionId: Id, end: PartitionEnd, event: KonvaEventObject<PointerEvent>) => void;
  /** Double click on a partition (opens its elevation view). When given, partitions listen even if not interactive. */
  onPartitionDoubleClick?: (partitionId: Id) => void;
}

const LABEL_FONT_PX = 11;
const LABEL_WIDTH_PX = 80;
const MIN_HIT_PX = 14;
const HANDLE_RADIUS_PX = 6;

export function PartitionLayer({
  partitions,
  scale,
  selectedId,
  invalidIds,
  interactive,
  onPartitionPointerDown,
  onHandlePointerDown,
  onPartitionDoubleClick,
}: PartitionLayerProps) {
  const fontSize = LABEL_FONT_PX / scale;
  const labelWidth = LABEL_WIDTH_PX / scale;

  return (
    <Group>
      {partitions.map((partition) => {
        const selected = partition.id === selectedId;
        const invalid = invalidIds.has(partition.id);
        const angle = angleBetween(partition.a, partition.b);
        const unit = direction(angle);
        const side = { x: unit.y, y: -unit.x };
        const labelDistance = partition.thickness / 2 + fontSize / 2 + 4 / scale;
        const center = midpoint(partition.a, partition.b);
        const color = invalid
          ? CANVAS_COLORS.invalid
          : selected
            ? CANVAS_COLORS.wallSelected
            : CANVAS_COLORS.partition;

        return (
          <Group key={partition.id}>
            <Line
              points={[partition.a.x, partition.a.y, partition.b.x, partition.b.y]}
              stroke={color}
              strokeWidth={partition.thickness}
              lineCap="butt"
              hitStrokeWidth={Math.max(partition.thickness, MIN_HIT_PX / scale)}
              listening={interactive || onPartitionDoubleClick !== undefined}
              onPointerDown={(event) => interactive && onPartitionPointerDown(partition.id, event)}
              onDblClick={() => onPartitionDoubleClick?.(partition.id)}
              onDblTap={() => onPartitionDoubleClick?.(partition.id)}
              onMouseEnter={(event) => interactive && setStageCursor(event.target, 'move')}
              onMouseLeave={(event) => setStageCursor(event.target, '')}
            />
            <Text
              x={center.x + side.x * labelDistance}
              y={center.y + side.y * labelDistance}
              width={labelWidth}
              offsetX={labelWidth / 2}
              offsetY={fontSize / 2}
              rotation={readableRotation(angle)}
              align="center"
              text={formatCm(Math.round(distance(partition.a, partition.b) * 10) / 10)}
              fontSize={fontSize}
              fontStyle={selected ? 'bold' : 'normal'}
              fill={color}
              listening={false}
            />
            {selected &&
              interactive &&
              (['a', 'b'] as const).map((end) => (
                <Circle
                  key={end}
                  x={partition[end].x}
                  y={partition[end].y}
                  radius={HANDLE_RADIUS_PX / scale}
                  fill={CANVAS_COLORS.handle}
                  stroke={CANVAS_COLORS.wallSelected}
                  strokeWidth={2 / scale}
                  onPointerDown={(event) => onHandlePointerDown(partition.id, end, event)}
                  onMouseEnter={(event) => setStageCursor(event.target, 'crosshair')}
                  onMouseLeave={(event) => setStageCursor(event.target, '')}
                />
              ))}
          </Group>
        );
      })}
    </Group>
  );
}

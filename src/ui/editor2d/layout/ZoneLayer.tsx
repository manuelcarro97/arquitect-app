import type { KonvaEventObject } from 'konva/lib/Node';
import { Circle, Group, Line, Text } from 'react-konva';
import { zoneAreaM2, type Id, type Zone } from '../../../domain';
import { formatM2 } from '../../format';
import { CANVAS_COLORS } from '../colors';
import { setStageCursor, vertexCentroid } from '../labels';

interface ZoneLayerProps {
  zones: Zone[];
  scale: number;
  selectedId: Id | null;
  interactive: boolean;
  onZonePointerDown: (zoneId: Id, event: KonvaEventObject<MouseEvent>) => void;
  onVertexPointerDown: (zoneId: Id, index: number, event: KonvaEventObject<MouseEvent>) => void;
}

const NAME_FONT_PX = 13;
const AREA_FONT_PX = 11;
const LABEL_WIDTH_PX = 140;
const HANDLE_RADIUS_PX = 5;

export function ZoneLayer({ zones, scale, selectedId, interactive, onZonePointerDown, onVertexPointerDown }: ZoneLayerProps) {
  const labelWidth = LABEL_WIDTH_PX / scale;

  return (
    <Group>
      {zones.map((zone) => {
        const selected = zone.id === selectedId;
        const center = vertexCentroid(zone.points);
        return (
          <Group key={zone.id}>
            <Line
              points={zone.points.flatMap((p) => [p.x, p.y])}
              closed
              fill={zone.color}
              opacity={selected ? 0.55 : 0.35}
              stroke={zone.color}
              strokeWidth={(selected ? 3 : 1) / scale}
              listening={interactive}
              onMouseDown={(event) => onZonePointerDown(zone.id, event)}
              onMouseEnter={(event) => setStageCursor(event.target, 'pointer')}
              onMouseLeave={(event) => setStageCursor(event.target, '')}
            />
            <Text
              x={center.x}
              y={center.y}
              width={labelWidth}
              offsetX={labelWidth / 2}
              offsetY={NAME_FONT_PX / scale}
              align="center"
              text={zone.name}
              fontSize={NAME_FONT_PX / scale}
              fontStyle="bold"
              fill={CANVAS_COLORS.label}
              listening={false}
            />
            <Text
              x={center.x}
              y={center.y + 3 / scale}
              width={labelWidth}
              offsetX={labelWidth / 2}
              align="center"
              text={formatM2(zoneAreaM2(zone))}
              fontSize={AREA_FONT_PX / scale}
              fill={CANVAS_COLORS.label}
              listening={false}
            />
            {selected &&
              interactive &&
              zone.points.map((point, index) => (
                <Circle
                  key={index}
                  x={point.x}
                  y={point.y}
                  radius={HANDLE_RADIUS_PX / scale}
                  fill={CANVAS_COLORS.handle}
                  stroke={zone.color}
                  strokeWidth={2 / scale}
                  onMouseDown={(event) => onVertexPointerDown(zone.id, index, event)}
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

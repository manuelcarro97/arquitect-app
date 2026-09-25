import { Rect } from 'react-konva';
import type { Point } from '../../../domain';
import { CANVAS_COLORS } from '../colors';
import type { SnapKind } from '../pointSnap';

const SIZE_PX = 9;

/** Square = sticks to a corner, diamond = sticks to a point along a wall, nothing = free (grid). */
export function SnapMarker({ point, kind, scale }: { point: Point; kind: SnapKind; scale: number }) {
  if (kind === 'grid') return null;
  const size = SIZE_PX / scale;
  return (
    <Rect
      x={point.x}
      y={point.y}
      width={size}
      height={size}
      offsetX={size / 2}
      offsetY={size / 2}
      rotation={kind === 'segment' ? 45 : 0}
      stroke={CANVAS_COLORS.guide}
      strokeWidth={2 / scale}
      listening={false}
    />
  );
}

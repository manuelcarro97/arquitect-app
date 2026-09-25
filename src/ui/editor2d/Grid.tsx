import { Group, Line } from 'react-konva';
import { CANVAS_COLORS } from './colors';
import { visibleWorldRect, type Viewport } from './viewport';

interface GridProps {
  viewport: Viewport;
  width: number;
  height: number;
}

/** Background grid in cm. Minor/major spacing adapts to the zoom level. */
export function Grid({ viewport, width, height }: GridProps) {
  const { left, top, right, bottom } = visibleWorldRect(viewport, width, height);
  const minor = viewport.scale >= 0.15 ? 50 : 100;
  const major = viewport.scale >= 0.15 ? 100 : 500;
  const strokeWidth = 1 / viewport.scale;

  const lines = [];
  for (let x = Math.floor(left / minor) * minor; x <= right; x += minor) {
    lines.push(
      <Line
        key={`v${x}`}
        points={[x, top, x, bottom]}
        stroke={x % major === 0 ? CANVAS_COLORS.gridMajor : CANVAS_COLORS.gridMinor}
        strokeWidth={strokeWidth}
      />,
    );
  }
  for (let y = Math.floor(top / minor) * minor; y <= bottom; y += minor) {
    lines.push(
      <Line
        key={`h${y}`}
        points={[left, y, right, y]}
        stroke={y % major === 0 ? CANVAS_COLORS.gridMajor : CANVAS_COLORS.gridMinor}
        strokeWidth={strokeWidth}
      />,
    );
  }
  return <Group listening={false}>{lines}</Group>;
}

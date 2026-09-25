import {
  getWalls,
  interiorSide,
  perimeterCorners,
  pointInFrontOf,
  pointInPolygon,
  type Floor,
  type WallGeometry,
  type WallSide,
} from '../../domain';

/** Where the viewer stands, in words: the zone in front of that face, or inside/outside the flat. */
export function viewpointLabel(floor: Floor, wall: WallGeometry, side: WallSide): string {
  const probe = pointInFrontOf(wall, side, wall.thickness / 2 + 30);
  const zone = floor.zones.find((z) => pointInPolygon(probe, z.points));
  if (zone) return `desde ${zone.name}`;
  if (wall.kind === 'perimeter') return interiorSide(floor, wall) === side ? 'desde dentro del piso' : 'desde fuera';
  return `desde la cara ${side}`;
}

const SIZE = { width: 180, height: 130 };
const PADDING = 12;
const EYE_DISTANCE_PX = 26;

/** Small plan with the wall highlighted and an arrow from where it is being looked at. */
export function ElevationMiniMap({ floor, wall, side }: { floor: Floor; wall: WallGeometry; side: WallSide }) {
  const walls = getWalls(floor);
  const points = [...perimeterCorners(floor.perimeter), ...floor.partitions.flatMap((p) => [p.a, p.b])];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(Math.max(...xs) - minX, 1);
  const spanY = Math.max(Math.max(...ys) - minY, 1);
  const scale = Math.min((SIZE.width - PADDING * 2) / spanX, (SIZE.height - PADDING * 2) / spanY);
  const offsetX = (SIZE.width - spanX * scale) / 2;
  const offsetY = (SIZE.height - spanY * scale) / 2;
  const sx = (x: number) => offsetX + (x - minX) * scale;
  const sy = (y: number) => offsetY + (y - minY) * scale;

  const eye = pointInFrontOf(wall, side, EYE_DISTANCE_PX / scale);
  const arrowTip = pointInFrontOf(wall, side, (wall.thickness / 2) + 4 / scale);

  return (
    <svg className="elevation__minimap" width={SIZE.width} height={SIZE.height} aria-label="Situación de la pared en el plano">
      <defs>
        <marker id="minimap-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#2f6fb5" />
        </marker>
      </defs>
      {floor.zones.map((zone) => (
        <polygon
          key={zone.id}
          points={zone.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')}
          fill={zone.color}
          opacity={0.35}
        />
      ))}
      {walls.map((w) => (
        <line
          key={w.id}
          x1={sx(w.start.x)}
          y1={sy(w.start.y)}
          x2={sx(w.end.x)}
          y2={sy(w.end.y)}
          stroke={w.id === wall.id ? '#2f6fb5' : '#9c978d'}
          strokeWidth={w.id === wall.id ? 4 : w.kind === 'perimeter' ? 2.5 : 1.5}
          strokeLinecap="round"
        />
      ))}
      <circle cx={sx(eye.x)} cy={sy(eye.y)} r={4} fill="#2f6fb5" />
      <line
        x1={sx(eye.x)}
        y1={sy(eye.y)}
        x2={sx(arrowTip.x)}
        y2={sy(arrowTip.y)}
        stroke="#2f6fb5"
        strokeWidth={2}
        markerEnd="url(#minimap-arrow)"
      />
    </svg>
  );
}

import { useState, type PointerEvent } from 'react';
import {
  centredOffset,
  findWall,
  invalidOpeningIds,
  wallJunctions,
  updateOpening,
  validateOpening,
  type Id,
  type Opening,
  type OpeningType,
} from '../../domain';
import { useProjectStore } from '../../store/projectStore';
import { useActiveFloor } from '../../store/selectors';
import { useElementSize } from '../hooks/useElementSize';
import { ElevationMiniMap, viewpointLabel } from './ElevationMiniMap';
import { wallLabel } from './OpeningDetails';
import { DEFAULT_PRESET_ID, findPreset } from './presets';

const MARGIN_PX = 56;
const HEADER_PX = 48;
const DIMENSION_GAP_PX = 22;

interface Drag {
  id: Id;
  startX: number;
  startOffset: number;
  offset: number;
}

/**
 * Front view of one wall, seen from either face, to place and size its openings.
 * Openings only slide horizontally; the sill height is typed in the side panel so it never changes by accident.
 */
export function ElevationView() {
  const floor = useActiveFloor();
  const wallId = useProjectStore((state) => state.elevationWallId);
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);
  const closeElevation = useProjectStore((state) => state.closeElevation);
  const side = useProjectStore((state) => state.elevationSide);
  const flipElevationSide = useProjectStore((state) => state.flipElevationSide);
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const [drag, setDrag] = useState<Drag | null>(null);

  const wall = wallId ? findWall(floor, wallId) : undefined;
  if (!wall) return null;

  const drawableWidth = Math.max(width - MARGIN_PX * 2, 50);
  const drawableHeight = Math.max(height - HEADER_PX - MARGIN_PX * 2 - DIMENSION_GAP_PX * 2, 50);
  const scale = Math.min(drawableWidth / wall.length, drawableHeight / wall.height);
  const left = (width - wall.length * scale) / 2;
  const bottom = HEADER_PX + MARGIN_PX + wall.height * scale;
  // Seen from face B the wall is mirrored: its start is on the right.
  const mirrored = side === 'B';
  const x = (u: number) => left + (mirrored ? wall.length - u : u) * scale;
  const right = left + wall.length * scale;
  const boxX = (from: number, to: number) => Math.min(x(from), x(to));
  const y = (z: number) => bottom - z * scale;

  const dragResult = drag ? updateOpening(floor, drag.id, { offset: drag.offset }) : null;
  const shown = dragResult?.ok ? dragResult.value : floor;
  const invalid = new Set(invalidOpeningIds(shown));
  if (drag && dragResult && !dragResult.ok) invalid.add(drag.id);
  const openings = shown.openings
    .map((opening) => (drag && opening.id === drag.id ? { ...opening, offset: drag.offset } : opening))
    .filter((opening) => opening.wallId === wall.id)
    .sort((a, b) => a.offset - b.offset);
  const selectedId = selection?.kind === 'opening' ? selection.id : null;

  const startDrag = (opening: Opening, event: PointerEvent<SVGRectElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    select({ kind: 'opening', id: opening.id });
    setDrag({ id: opening.id, startX: event.clientX, startOffset: opening.offset, offset: opening.offset });
  };

  const moveDrag = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const opening = floor.openings.find((o) => o.id === drag.id);
    if (!opening) return;
    const offset = Math.min(
      Math.max(Math.round(drag.startOffset + ((mirrored ? -1 : 1) * (event.clientX - drag.startX)) / scale), 0),
      Math.floor(wall.length - opening.width),
    );
    if (offset !== drag.offset) setDrag({ ...drag, offset });
  };

  const endDrag = () => {
    if (!drag) return;
    if (drag.offset !== drag.startOffset) useProjectStore.getState().updateOpening(drag.id, { offset: drag.offset });
    setDrag(null);
  };

  const addCentred = (type: OpeningType) => {
    const preset = findPreset(DEFAULT_PRESET_ID[type]);
    if (!preset) return;
    const offset = centredOffset(wall.length, wall.length / 2, preset.width);
    if (offset === null) return;
    const input = { wallId: wall.id, type, offset, width: preset.width, height: preset.height, sillHeight: preset.sillHeight };
    if (validateOpening(floor, input) === null) useProjectStore.getState().addOpening(input);
    else useProjectStore.setState({ lastError: 'OPENING_OVERLAP' });
  };

  // Perpendicular walls touching this one: drawn as full-height bands so the divisions are visible.
  const junctions = wallJunctions(floor, wall);
  // Chain of horizontal dimensions along the bottom: wall ends, every jamb and every joining wall face.
  const stops = [
    0,
    ...openings.flatMap((o) => [o.offset, o.offset + o.width]),
    ...junctions.flatMap((j) => [j.along - j.width / 2, j.along + j.width / 2]),
    wall.length,
  ]
    .map((stop) => Math.min(Math.max(stop, 0), wall.length))
    .sort((a, b) => a - b);
  const selected = openings.find((o) => o.id === selectedId);

  return (
    <div className="elevation" ref={ref}>
      <header className="elevation__header">
        <strong>Alzado · {wallLabel(floor, wall)}</strong>
        <span className="elevation__meta">
          {Math.round(wall.length)} × {wall.height} cm · visto {viewpointLabel(floor, wall, side)}
        </span>
        <div className="elevation__actions">
          <button onClick={flipElevationSide} title="Mirar la pared desde el otro lado">
            ⇄ Ver desde el otro lado
          </button>
          <button onClick={() => addCentred('door')}>+ Puerta</button>
          <button onClick={() => addCentred('window')}>+ Ventana</button>
          <button className="primary-button" onClick={closeElevation}>
            Cerrar ✕
          </button>
        </div>
      </header>

      {width > 0 && (
        <svg className="elevation__canvas" width={width} height={height} onPointerMove={moveDrag} onPointerUp={endDrag}>
          <rect x={left} y={y(wall.height)} width={wall.length * scale} height={wall.height * scale} className="elevation__wall" />
          <line x1={left - 20} x2={right + 20} y1={y(0)} y2={y(0)} className="elevation__floor" />

          {junctions.map((junction) => {
            const visible = junction.side === side || junction.side === 'both';
            return (
              <rect
                key={`${junction.wallId}-${junction.along}`}
                x={boxX(junction.along - junction.width / 2, junction.along + junction.width / 2)}
                y={y(wall.height)}
                width={junction.width * scale}
                height={wall.height * scale}
                className={`elevation__junction ${visible ? '' : 'elevation__junction--behind'}`}
              >
                <title>{visible ? 'Pared que llega a esta desde este lado' : 'Pared al otro lado de esta'}</title>
              </rect>
            );
          })}

          {openings.map((opening) => {
            const isSelected = opening.id === selectedId;
            const classes = [
              'elevation__opening',
              `elevation__opening--${opening.type}`,
              isSelected ? 'is-selected' : '',
              invalid.has(opening.id) ? 'is-invalid' : '',
            ].join(' ');
            return (
              <g key={opening.id}>
                <rect
                  x={boxX(opening.offset, opening.offset + opening.width)}
                  y={y(opening.sillHeight + opening.height)}
                  width={opening.width * scale}
                  height={opening.height * scale}
                  className={classes}
                  onPointerDown={(event) => startDrag(opening, event)}
                />
                <text x={x(opening.offset + opening.width / 2)} y={y(opening.sillHeight + opening.height / 2)} className="elevation__label">
                  {opening.width}×{opening.height}
                </text>
              </g>
            );
          })}

          {stops.slice(0, -1).map((stop, i) => {
            const next = stops[i + 1];
            if (next - stop < 0.5) return null;
            const lineY = y(0) + DIMENSION_GAP_PX;
            return (
              <g key={i} className="elevation__dimension">
                <line x1={x(stop)} x2={x(next)} y1={lineY} y2={lineY} />
                <line x1={x(stop)} x2={x(stop)} y1={lineY - 5} y2={lineY + 5} />
                <line x1={x(next)} x2={x(next)} y1={lineY - 5} y2={lineY + 5} />
                <text x={(x(stop) + x(next)) / 2} y={lineY - 5}>
                  {Math.round(next - stop)}
                </text>
              </g>
            );
          })}

          <g className="elevation__dimension">
            <line x1={left - DIMENSION_GAP_PX} x2={left - DIMENSION_GAP_PX} y1={y(0)} y2={y(wall.height)} />
            <text x={left - DIMENSION_GAP_PX - 6} y={(y(0) + y(wall.height)) / 2} textAnchor="end">
              {wall.height}
            </text>
          </g>

          {selected && selected.sillHeight > 0 && (
            <g className="elevation__dimension elevation__dimension--accent">
              <line
                x1={Math.max(x(selected.offset), x(selected.offset + selected.width)) + 12}
                x2={Math.max(x(selected.offset), x(selected.offset + selected.width)) + 12}
                y1={y(0)}
                y2={y(selected.sillHeight)}
              />
              <text x={Math.max(x(selected.offset), x(selected.offset + selected.width)) + 18} y={(y(0) + y(selected.sillHeight)) / 2} textAnchor="start">
                alféizar {selected.sillHeight}
              </text>
            </g>
          )}
        </svg>
      )}
      <ElevationMiniMap floor={floor} wall={wall} side={side} />
      <div className="elevation__hint">
        Arrastra un hueco para moverlo a lo largo de la pared · la altura del alféizar y las medidas exactas se editan en el
        panel lateral
      </div>
    </div>
  );
}

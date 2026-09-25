import type { KonvaEventObject } from 'konva/lib/Node';
import { useEffect, useState } from 'react';
import { Group } from 'react-konva';
import {
  centredOffset,
  findWall,
  invalidOpeningIds,
  updateOpening,
  validateOpening,
  wallAtPoint,
  wallDirection,
  type Floor,
  type Id,
  type Opening,
  type OpeningType,
  type Point,
} from '../../../domain';
import { useProjectStore } from '../../../store/projectStore';
import { DEFAULT_PRESET_ID, findPreset, presetsOf } from '../../openings/presets';
import { CANVAS_COLORS } from '../colors';
import { isTypingInForm } from '../controller';
import { OpeningSymbol } from './OpeningSymbol';

/** How close (screen px) the pointer must be to a wall to place an opening on it. */
const WALL_REACH_PX = 18;

interface OpeningDrag {
  id: Id;
  originAlong: number;
  startOffset: number;
  offset: number;
}

interface OpeningsOptions {
  floor: Floor;
  scale: number;
  /** Type being placed, or null when the placing tool is not active. */
  placing: OpeningType | null;
  /** Whether openings can be clicked and dragged (select tool of the active mode). */
  selectable: boolean;
  onExitTool: () => void;
}

function alongWall(wallStart: Point, direction: Point, point: Point): number {
  return (point.x - wallStart.x) * direction.x + (point.y - wallStart.y) * direction.y;
}

/**
 * Doors and windows in the 2D editor, shared by every mode: drawing, the placing tool
 * (hover a wall, click to place) and dragging an opening along its wall.
 */
export function useOpenings({ floor, scale, placing, selectable, onExitTool }: OpeningsOptions) {
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);
  const [presetIds, setPresetIds] = useState(DEFAULT_PRESET_ID);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [drag, setDrag] = useState<OpeningDrag | null>(null);

  const preset = placing ? findPreset(presetIds[placing]) : undefined;

  // Placement preview: the opening centred on the pointer, on the nearest wall.
  let preview: { opening: Opening; valid: boolean } | null = null;
  if (placing && preset && pointer) {
    const hit = wallAtPoint(floor, pointer, WALL_REACH_PX / scale);
    const offset = hit && centredOffset(hit.wall.length, hit.along, preset.width);
    if (hit && offset !== null && offset !== undefined) {
      const opening: Opening = {
        id: 'preview',
        wallId: hit.wall.id,
        type: preset.type,
        offset,
        width: preset.width,
        height: preset.height,
        sillHeight: preset.sillHeight,
      };
      preview = { opening, valid: validateOpening(floor, opening) === null };
    }
  }

  // Drag preview: the store is only updated on release (one undo step).
  const dragResult = drag && drag.offset !== drag.startOffset ? updateOpening(floor, drag.id, { offset: drag.offset }) : null;
  const displayed = dragResult?.ok ? dragResult.value : floor;
  const invalid = new Set(invalidOpeningIds(displayed));
  if (dragResult && !dragResult.ok && drag) invalid.add(drag.id);

  useEffect(() => {
    if (!drag) return;
    const onMouseUp = () => {
      if (drag.offset !== drag.startOffset) useProjectStore.getState().updateOpening(drag.id, { offset: drag.offset });
      setDrag(null);
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [drag]);

  useEffect(() => {
    if (!placing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingInForm(event.target) || event.key !== 'Escape') return;
      event.preventDefault();
      onExitTool();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [placing, onExitTool]);

  const startDrag = (opening: Opening, event: KonvaEventObject<MouseEvent>) => {
    if (event.evt.button !== 0) return;
    event.cancelBubble = true;
    select({ kind: 'opening', id: opening.id });
    const wall = findWall(floor, opening.wallId);
    const world = event.target.getStage()?.getRelativePointerPosition();
    if (!wall || !world) return;
    const originAlong = alongWall(wall.start, wallDirection(wall), world);
    setDrag({ id: opening.id, originAlong, startOffset: opening.offset, offset: opening.offset });
  };

  const selectedId = selection?.kind === 'opening' ? selection.id : null;

  const layer = (
    <Group>
      {displayed.openings.map((opening) => {
        const wall = findWall(displayed, opening.wallId);
        if (!wall) return null;
        const color = invalid.has(opening.id)
          ? CANVAS_COLORS.invalid
          : opening.id === selectedId
            ? CANVAS_COLORS.wallSelected
            : CANVAS_COLORS.wall;
        return (
          <OpeningSymbol
            key={opening.id}
            wall={wall}
            opening={opening}
            scale={scale}
            color={color}
            interactive={selectable}
            onPointerDown={(event) => startDrag(opening, event)}
          />
        );
      })}
      {preview &&
        (() => {
          const wall = findWall(floor, preview.opening.wallId);
          return (
            wall && (
              <OpeningSymbol
                wall={wall}
                opening={preview.opening}
                scale={scale}
                color={preview.valid ? CANVAS_COLORS.preview : CANVAS_COLORS.invalid}
                opacity={0.8}
                interactive={false}
              />
            )
          );
        })()}
    </Group>
  );

  const toolOptions =
    placing && preset ? (
      <select
        className="toolbar-select"
        value={preset.id}
        aria-label="Medidas"
        onChange={(event) => setPresetIds((ids) => ({ ...ids, [placing]: event.target.value }))}
      >
        {presetsOf(placing).map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    ) : null;

  const hint = placing
    ? preview && !preview.valid
      ? 'No cabe ahí: se solapa con otro hueco.'
      : `Pasa por una pared y haz clic para colocar ${placing === 'door' ? 'la puerta' : 'la ventana'} · Esc o clic derecho = terminar`
    : drag
      ? `Posición: ${drag.offset} cm desde el inicio de la pared${dragResult && !dragResult.ok ? ' — no cabe ahí' : ''}`
      : null;

  return {
    layer,
    toolOptions,
    hint,
    isDragging: drag !== null,
    /** Returns true when the openings feature used the event (dragging). */
    handlePointerMove: (world: Point): boolean => {
      setPointer(world);
      if (!drag) return false;
      const opening = floor.openings.find((o) => o.id === drag.id);
      const wall = opening && findWall(floor, opening.wallId);
      if (!opening || !wall) return true;
      const moved = alongWall(wall.start, wallDirection(wall), world) - drag.originAlong;
      const offset = Math.min(Math.max(Math.round(drag.startOffset + moved), 0), Math.floor(wall.length - opening.width));
      if (offset !== drag.offset) setDrag({ ...drag, offset });
      return true;
    },
    handleClick: () => {
      if (!preview) return;
      const { id, ...input } = preview.opening;
      void id;
      useProjectStore.getState().addOpening(input);
    },
  };
}

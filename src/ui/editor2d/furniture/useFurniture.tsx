import type { KonvaEventObject } from 'konva/lib/Node';
import { useEffect, useState } from 'react';
import { Group, Line, Rect, Text } from 'react-konva';
import {
  furnitureOutsideIds,
  getWalls,
  snapFurnitureToWalls,
  type Floor,
  type Furniture,
  type Id,
  type Point,
} from '../../../domain';
import { useProjectStore } from '../../../store/projectStore';
import { catalogItem } from '../../furniture/catalog';
import { CANVAS_COLORS } from '../colors';
import { isTypingInForm } from '../controller';
import { setStageCursor } from '../labels';

const SNAP_PX = 14;
const LABEL_FONT_PX = 11;
const ROTATE_STEP = 90;
const ROTATE_FINE_STEP = 15;

interface FurnitureDrag {
  id: Id;
  /** Centre minus pointer at grab time, so the piece does not jump under the cursor. */
  grab: Point;
  x: number;
  y: number;
  moved: boolean;
}

interface FurnitureOptions {
  floor: Floor;
  scale: number;
  /** Whether this mode reacts to input (placing, keys). */
  active: boolean;
  /** Whether pieces can be clicked and dragged (select tool). */
  selectable: boolean;
}

function FurniturePiece({
  item,
  scale,
  stroke,
  opacity = 1,
  interactive,
  onPointerDown,
}: {
  item: Furniture;
  scale: number;
  stroke: string;
  opacity?: number;
  interactive: boolean;
  onPointerDown?: (event: KonvaEventObject<MouseEvent>) => void;
}) {
  const info = catalogItem(item.catalogId);
  const fontSize = Math.min(LABEL_FONT_PX / scale, item.depth / 3);
  return (
    <Group x={item.x} y={item.y} rotation={item.rotation} opacity={opacity}>
      <Rect
        x={-item.width / 2}
        y={-item.depth / 2}
        width={item.width}
        height={item.depth}
        fill={info.color}
        stroke={stroke}
        strokeWidth={1.5 / scale}
        cornerRadius={2}
        listening={interactive}
        onMouseDown={onPointerDown}
        onMouseEnter={(event) => interactive && setStageCursor(event.target, 'move')}
        onMouseLeave={(event) => setStageCursor(event.target, '')}
      />
      {/* Thicker line on the front edge, so the orientation is visible. */}
      <Line
        points={[-item.width / 2, item.depth / 2, item.width / 2, item.depth / 2]}
        stroke={stroke}
        strokeWidth={3 / scale}
        listening={false}
      />
      <Text
        x={-item.width / 2}
        y={-fontSize / 2}
        width={item.width}
        align="center"
        text={info.name}
        fontSize={fontSize}
        fill={CANVAS_COLORS.label}
        wrap="none"
        ellipsis
        listening={false}
      />
    </Group>
  );
}

/** Furniture on the 2D plan: drawing, placing from the catalog, dragging with wall snapping and rotating. */
export function useFurniture({ floor, scale, active, selectable }: FurnitureOptions) {
  const placingId = useProjectStore((state) => (active ? state.placingFurniture : null));
  const selection = useProjectStore((state) => state.selection);
  const select = useProjectStore((state) => state.select);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [freeMove, setFreeMove] = useState(false);
  const [placingRotation, setPlacingRotation] = useState(0);
  const [drag, setDrag] = useState<FurnitureDrag | null>(null);

  const walls = getWalls(floor);
  const tolerance = SNAP_PX / scale;
  const snapped = (item: Omit<Furniture, 'id' | 'catalogId' | 'height'>) =>
    freeMove ? { x: item.x, y: item.y } : snapFurnitureToWalls(item, walls, tolerance);

  // Piece following the pointer while placing.
  let preview: Furniture | null = null;
  if (placingId && pointer) {
    const info = catalogItem(placingId);
    const base = { x: pointer.x, y: pointer.y, width: info.width, depth: info.depth, rotation: placingRotation };
    const position = snapped(base);
    preview = { ...base, x: Math.round(position.x), y: Math.round(position.y), id: 'preview', catalogId: placingId, height: info.height };
  }

  const displayed: Furniture[] = floor.furniture.map((item) =>
    drag && item.id === drag.id ? { ...item, x: drag.x, y: drag.y } : item,
  );
  const outside = new Set(furnitureOutsideIds({ ...floor, furniture: displayed }));
  const selectedId = selection?.kind === 'furniture' ? selection.id : null;

  useEffect(() => {
    if (!drag) return;
    const onMouseUp = () => {
      if (drag.moved) useProjectStore.getState().updateFurniture(drag.id, { x: drag.x, y: drag.y });
      setDrag(null);
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [drag]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingInForm(event.target)) return;
      const store = useProjectStore.getState();
      if (event.key.toLowerCase() === 'r') {
        const step = event.shiftKey ? ROTATE_FINE_STEP : ROTATE_STEP;
        if (store.placingFurniture) setPlacingRotation((rotation) => (rotation + step) % 360);
        else if (store.selection?.kind === 'furniture') {
          const piece = floor.furniture.find((item) => item.id === store.selection?.id);
          if (piece) store.updateFurniture(piece.id, { rotation: piece.rotation + step });
        } else return;
      } else if (event.key === 'Escape' && store.placingFurniture) {
        store.stopPlacingFurniture();
      } else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, floor.furniture]);

  const startDrag = (item: Furniture, event: KonvaEventObject<MouseEvent>) => {
    if (event.evt.button !== 0) return;
    event.cancelBubble = true;
    select({ kind: 'furniture', id: item.id });
    const world = event.target.getStage()?.getRelativePointerPosition();
    if (world) setDrag({ id: item.id, grab: { x: item.x - world.x, y: item.y - world.y }, x: item.x, y: item.y, moved: false });
  };

  const layer = (
    <Group>
      {displayed.map((item) => (
        <FurniturePiece
          key={item.id}
          item={item}
          scale={scale}
          stroke={outside.has(item.id) ? CANVAS_COLORS.invalid : item.id === selectedId ? CANVAS_COLORS.wallSelected : CANVAS_COLORS.wall}
          interactive={selectable}
          onPointerDown={(event) => startDrag(item, event)}
        />
      ))}
      {preview && <FurniturePiece item={preview} scale={scale} stroke={CANVAS_COLORS.preview} opacity={0.75} interactive={false} />}
    </Group>
  );

  const hint = placingId
    ? `Colocando ${catalogItem(placingId).name}: clic para dejarlo · R = girar 90° (Shift+R: 15°) · se pega a las paredes (Shift = libre) · Esc o clic derecho = cancelar`
    : drag
      ? 'Suelta para dejarlo · se pega a las paredes (mantén Shift para moverlo libre) · R = girar'
      : null;

  return {
    layer,
    hint,
    isPlacing: placingId !== null,
    /** Returns true when furniture used the event (placing or dragging). */
    handlePointerMove: (world: Point, shiftKey: boolean): boolean => {
      setPointer(world);
      setFreeMove(shiftKey);
      if (!drag) return placingId !== null;
      const piece = floor.furniture.find((item) => item.id === drag.id);
      if (!piece) return true;
      const raw = { x: world.x + drag.grab.x, y: world.y + drag.grab.y, width: piece.width, depth: piece.depth, rotation: piece.rotation };
      const position = shiftKey ? raw : snapFurnitureToWalls(raw, walls, tolerance);
      setDrag({ ...drag, x: Math.round(position.x), y: Math.round(position.y), moved: true });
      return true;
    },
    handleClick: (): boolean => {
      if (!placingId || !preview) return placingId !== null;
      const { id, ...input } = preview;
      void id;
      const store = useProjectStore.getState();
      if (store.addFurniture(input)) store.stopPlacingFurniture();
      return true;
    },
    cancelPlacing: (): boolean => {
      if (!placingId) return false;
      useProjectStore.getState().stopPlacingFurniture();
      return true;
    },
  };
}

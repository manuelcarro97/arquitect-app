import type { ReactNode } from 'react';
import type { Floor, Point } from '../../domain';
import type { LayerVisibility } from '../../store/viewStore';
import type { AngleStep } from './snap';

/** What every editor mode receives from the shell (viewport and shared settings). */
export interface EditorContext {
  floor: Floor;
  scale: number;
  angleStep: AngleStep;
  /** Only the active mode reacts to keyboard and pointer input. */
  active: boolean;
  /** Which optional layers (zones, furniture, finishes) the plan shows. */
  layers: LayerVisibility;
}

/** Exact length for the segment being drawn, typed in a field (phones have no keyboard shortcut for it). */
export interface LengthEntry {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

/** Keeps only digits and one decimal comma, as the keyboard shortcut does. */
export function sanitizeTypedLength(value: string): string {
  const [whole, ...decimals] = value.replace(/\./g, ',').replace(/[^0-9,]/g, '').split(',');
  return decimals.length > 0 ? `${whole},${decimals.join('')}` : whole;
}

export interface ToolButton {
  id: string;
  label: string;
  title: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * A mode of the 2D editor (Estructura, Distribución…). The shell owns the canvas, zoom and pan,
 * and forwards pointer input to the active controller, which owns its tools and drawing.
 */
export interface EditorController {
  tools: ToolButton[];
  showAngleSnap: boolean;
  /** Extra controls for the active tool (e.g. door/window sizes). */
  toolOptions?: ReactNode;
  /** Present while drawing a segment whose length can be typed. */
  lengthEntry?: LengthEntry;
  /** Konva nodes, in world coordinates (cm). */
  layers: ReactNode;
  hint: string | null;
  cursor: string;
  onPointerMove: (world: Point, shiftKey: boolean) => void;
  /** `onEmpty` is true when the click did not hit any shape. */
  onClick: (world: Point, onEmpty: boolean) => void;
  /** Right click without dragging: finish or leave the current tool. */
  onSecondaryClick: () => void;
}

export function isTypingInForm(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
  );
}

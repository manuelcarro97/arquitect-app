import type { ReactNode } from 'react';
import type { Floor, Point } from '../../domain';
import type { AngleStep } from './snap';

/** What every editor mode receives from the shell (viewport and shared settings). */
export interface EditorContext {
  floor: Floor;
  scale: number;
  angleStep: AngleStep;
  /** Only the active mode reacts to keyboard and pointer input. */
  active: boolean;
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
  /** Konva nodes, in world coordinates (cm). */
  layers: ReactNode;
  hint: string | null;
  cursor: string;
  onPointerMove: (world: Point, shiftKey: boolean) => void;
  /** `onEmpty` is true when the click did not hit any shape. */
  onClick: (world: Point, onEmpty: boolean) => void;
}

export function isTypingInForm(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
  );
}

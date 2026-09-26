import { useEffect, useEffectEvent, useRef, type RefObject } from 'react';
import type { Point } from '../../domain';
import { cancelDrags } from './dragEnd';
import { pinchViewport } from './gestures';
import type { Viewport } from './viewport';

interface TouchInputOptions {
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  /** One finger moving: like the mouse moving over the plan (world coordinates, cm). */
  onMove: (world: Point) => void;
  /** One finger lifted: like a left click. `onEmpty` is true when it touched no shape. */
  onRelease: (world: Point, onEmpty: boolean) => void;
}

/** Class of the plan's canvas container: only touches that start there are plan gestures. */
export const PLAN_STAGE_CLASS = 'editor2d__stage';

type Gesture =
  | { kind: 'single'; pointerId: number }
  | { kind: 'pinch'; start: Viewport; from: [Point, Point] }
  /** After a pinch: nothing happens until every finger is lifted. */
  | { kind: 'ended' };

/**
 * Finger input on the plan. One finger works like the left mouse button (draw, select, drag);
 * two fingers pan and zoom, and cancel whatever the first finger had started.
 * Returns `markTouchedEmpty`, which the stage calls when a touch starts on no shape,
 * and `wasRecentTouch`, to ignore the mouse events browsers emulate after a tap.
 */
export function useTouchInput(container: RefObject<HTMLElement | null>, options: TouchInputOptions) {
  const touchedEmpty = useRef(false);
  const lastTouchAt = useRef(0);

  const toWorld = (screen: Point): Point => ({
    x: (screen.x - options.viewport.x) / options.viewport.scale,
    y: (screen.y - options.viewport.y) / options.viewport.scale,
  });

  const move = useEffectEvent((screen: Point) => options.onMove(toWorld(screen)));
  const release = useEffectEvent((screen: Point) => options.onRelease(toWorld(screen), touchedEmpty.current));
  const currentViewport = useEffectEvent(() => options.viewport);
  const pan = useEffectEvent((viewport: Viewport) => options.setViewport(viewport));

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const fingers = new Map<number, Point>();
    let gesture: Gesture | null = null;

    const local = (event: PointerEvent): Point => {
      const box = element.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };
    const firstTwo = (): [Point, Point] => {
      const [a, b] = [...fingers.values()];
      return [a, b];
    };

    const onDown = (event: PointerEvent) => {
      // Only touches on the plan itself: buttons and panels floating over it work as usual.
      const onPlan = event.target instanceof HTMLElement && event.target.closest(`.${PLAN_STAGE_CLASS}`) !== null;
      if (event.pointerType !== 'touch' || !onPlan) return;
      lastTouchAt.current = Date.now();
      fingers.set(event.pointerId, local(event));
      if (fingers.size === 1) {
        touchedEmpty.current = false;
        gesture = { kind: 'single', pointerId: event.pointerId };
        move(local(event));
      } else if (fingers.size === 2) {
        cancelDrags();
        gesture = { kind: 'pinch', start: currentViewport(), from: firstTwo() };
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || !fingers.has(event.pointerId)) return;
      fingers.set(event.pointerId, local(event));
      if (gesture?.kind === 'single' && gesture.pointerId === event.pointerId) move(local(event));
      else if (gesture?.kind === 'pinch' && fingers.size >= 2) pan(pinchViewport(gesture.start, gesture.from, firstTwo()));
    };

    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' || !fingers.has(event.pointerId)) return;
      lastTouchAt.current = Date.now();
      fingers.delete(event.pointerId);
      if (gesture?.kind === 'single' && event.type === 'pointerup') release(local(event));
      else if (gesture?.kind === 'pinch') gesture = { kind: 'ended' };
      if (fingers.size === 0) gesture = null;
    };

    // Capture phase: runs before the canvas handles the same event.
    element.addEventListener('pointerdown', onDown, true);
    element.addEventListener('pointermove', onMove, true);
    window.addEventListener('pointerup', onUp, true);
    window.addEventListener('pointercancel', onUp, true);
    return () => {
      element.removeEventListener('pointerdown', onDown, true);
      element.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
    };
  }, [container]);

  return {
    markTouchedEmpty: () => {
      touchedEmpty.current = true;
    },
    wasRecentTouch: () => Date.now() - lastTouchAt.current < 800,
  };
}

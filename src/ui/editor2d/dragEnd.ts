import { useEffect, useEffectEvent } from 'react';

/** Fired by the plan when a drag in progress must stop without applying it (e.g. a second finger touched). */
const CANCEL_DRAG_EVENT = 'arquitect:cancel-drag';

export function cancelDrags(): void {
  window.dispatchEvent(new Event(CANCEL_DRAG_EVENT));
}

/**
 * While a drag is `active`: releasing the pointer (mouse or finger) calls `onCommit`;
 * an interrupted drag (second finger, pointer cancelled by the browser) calls `onCancel`.
 */
export function useDragEnd(active: boolean, onCommit: () => void, onCancel: () => void): void {
  const commit = useEffectEvent(onCommit);
  const cancel = useEffectEvent(onCancel);

  useEffect(() => {
    if (!active) return;
    const handleUp = () => commit();
    const handleCancel = () => cancel();
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    window.addEventListener(CANCEL_DRAG_EVENT, handleCancel);
    return () => {
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
      window.removeEventListener(CANCEL_DRAG_EVENT, handleCancel);
    };
  }, [active]);
}

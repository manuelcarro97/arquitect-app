import { useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';

function isTypingInForm(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}

/** Undo/redo and delete-selection shortcuts. Ignored while typing in a form field. */
export function useGlobalShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingInForm(event.target)) return;
      const { undo, redo } = useProjectStore.temporal.getState();
      const ctrl = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (ctrl && key === 'z' && !event.shiftKey) {
        undo();
      } else if (ctrl && (key === 'y' || (key === 'z' && event.shiftKey))) {
        redo();
      } else if (event.key === 'Delete') {
        useProjectStore.getState().removeSelection();
      } else {
        return;
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

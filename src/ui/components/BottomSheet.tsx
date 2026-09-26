import type { ReactNode } from 'react';

interface BottomSheetProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/** Panel that slides up from the bottom of the screen (phones); closed, only its tab is visible. */
export function BottomSheet({ title, open, onToggle, children }: BottomSheetProps) {
  return (
    <section className={`bottom-sheet ${open ? 'is-open' : ''}`} aria-label={title}>
      <button className="bottom-sheet__tab" onClick={onToggle} aria-expanded={open}>
        <span aria-hidden="true">{open ? '▼' : '▲'}</span> {title}
      </button>
      {open && <div className="bottom-sheet__content">{children}</div>}
    </section>
  );
}

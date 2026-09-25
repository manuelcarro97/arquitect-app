import { useEffect, useRef, useState, type ReactNode } from 'react';

interface PopoverProps {
  /** Content of the trigger button. */
  label: ReactNode;
  title?: string;
  buttonClassName?: string;
  align?: 'left' | 'right';
  /** Receives a `close` callback so actions inside can dismiss the popover. */
  children: (close: () => void) => ReactNode;
}

/** Button that opens a floating panel. Closes on outside click or Escape. */
export function Popover({ label, title, buttonClassName, align = 'left', children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="popover" ref={rootRef}>
      <button
        className={`${buttonClassName ?? ''} ${open ? 'is-active' : ''}`}
        title={title}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      {open && <div className={`popover__panel popover__panel--${align}`}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

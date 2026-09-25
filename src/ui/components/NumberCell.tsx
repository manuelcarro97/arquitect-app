import { useEffect, useRef, type KeyboardEvent } from 'react';
import { roundForInput } from '../format';

export function parseNumber(text: string): number {
  return Number(text.replace(',', '.'));
}

/** Commits on Enter/blur, restores on Escape. Remounts (via key) when the stored value changes. */
export function NumberCell({
  value,
  onCommit,
  autoFocus,
  ariaLabel,
}: {
  value: number;
  onCommit: (value: number) => void;
  autoFocus: boolean;
  ariaLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [autoFocus]);

  const commit = (text: string) => {
    const parsed = parseNumber(text);
    if (Number.isFinite(parsed) && parsed !== roundForInput(value)) onCommit(parsed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      event.currentTarget.value = String(roundForInput(value));
      event.currentTarget.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      className="number-input"
      inputMode="decimal"
      aria-label={ariaLabel}
      defaultValue={roundForInput(value)}
      onBlur={(event) => commit(event.currentTarget.value)}
      onKeyDown={handleKeyDown}
    />
  );
}

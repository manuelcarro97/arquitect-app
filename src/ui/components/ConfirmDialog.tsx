interface ConfirmDialogProps {
  message: string;
  confirmLabel: string;
  onAnswer: (confirmed: boolean) => void;
}

/** Modal question with Cancel / confirm buttons (window.confirm, but styled like the app). */
export function ConfirmDialog({ message, confirmLabel, onAnswer }: ConfirmDialogProps) {
  return (
    <div className="dialog-backdrop" onClick={() => onAnswer(false)}>
      <div
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.key === 'Escape' && onAnswer(false)}
      >
        <p>{message}</p>
        <div className="menu__actions">
          <button autoFocus onClick={() => onAnswer(false)}>
            Cancelar
          </button>
          <button className="danger-button" onClick={() => onAnswer(true)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

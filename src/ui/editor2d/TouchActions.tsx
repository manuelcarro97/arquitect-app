import { useProjectStore } from '../../store/projectStore';
import type { LengthEntry } from './controller';

interface TouchActionsProps {
  /** A drawing or placing tool is in use (what a right click would leave). */
  toolActive: boolean;
  onFinish: () => void;
  lengthEntry: LengthEntry | undefined;
  /** Live measurement of what is being drawn or dragged. */
  readout: string | undefined;
}

const ROTATE_STEP = 90;

/**
 * Buttons floating over the plan on touch screens, for what the mouse and keyboard do on a computer:
 * finishing a tool (right click / Esc), rotating, duplicating and deleting (R, Supr) and typing a length.
 */
export function TouchActions({ toolActive, onFinish, lengthEntry, readout }: TouchActionsProps) {
  const selection = useProjectStore((state) => state.selection);
  const furniture = useProjectStore((state) =>
    state.selection?.kind === 'furniture'
      ? state.project.versions
          .find((version) => version.id === state.activeVersionId)
          ?.floor.furniture.find((item) => item.id === state.selection?.id)
      : undefined,
  );
  const updateFurniture = useProjectStore((state) => state.updateFurniture);
  const duplicateFurniture = useProjectStore((state) => state.duplicateFurniture);
  const removeSelection = useProjectStore((state) => state.removeSelection);
  const deletable = selection !== null && ['segment', 'partition', 'zone', 'opening', 'furniture'].includes(selection.kind);

  if (!toolActive && !deletable && !lengthEntry && !readout) return null;

  return (
    <div className="touch-actions">
      {readout && (
        <output className="touch-actions__readout" aria-live="polite">
          {readout}
        </output>
      )}
      {lengthEntry && (
        <form
          className="touch-actions__length"
          onSubmit={(event) => {
            event.preventDefault();
            lengthEntry.onSubmit();
          }}
        >
          <input
            inputMode="decimal"
            placeholder="Medida (cm)"
            aria-label="Medida del tramo en centímetros"
            value={lengthEntry.value}
            onChange={(event) => lengthEntry.onChange(event.target.value)}
          />
          <button type="submit" disabled={lengthEntry.value === ''} title="Añadir el tramo con esta medida">
            OK
          </button>
        </form>
      )}
      {furniture && (
        <>
          <button onClick={() => updateFurniture(furniture.id, { rotation: furniture.rotation + ROTATE_STEP })}>↻ Girar</button>
          <button onClick={() => duplicateFurniture(furniture.id)}>⧉ Duplicar</button>
        </>
      )}
      {deletable && (
        <button className="danger-button" onClick={removeSelection}>
          🗑 Borrar
        </button>
      )}
      {toolActive && (
        <button className="primary-button" onClick={onFinish}>
          ✓ Terminar
        </button>
      )}
    </div>
  );
}

import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useProjectStore, type SelectionKind } from '../store/projectStore';
import { BottomSheet } from './components/BottomSheet';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Editor2D } from './editor2d/Editor2D';
import { TouchActionsSlot } from './editor2d/touchActionsSlot';
import { MODE_PANEL_NAMES, ModePanel } from './ModePanel';
import { ModeSwitcher } from './topbar/ModeSwitcher';

const Viewer3D = lazy(() => import('./viewer3d/Viewer3D'));

type View = 'plan' | 'viewer3d';

/** Selecting one of these shows its details or options, which live in the panel: the sheet opens. */
const KINDS_WITH_DETAILS: SelectionKind[] = ['furniture', 'opening', 'wallFace', 'floor'];

function MaximizeButton({ maximized, onClick }: { maximized: boolean; onClick: () => void }) {
  return (
    <button
      className="compact-view__maximize icon-only"
      onClick={onClick}
      title={maximized ? 'Ver plano y 3D a la vez' : 'Ampliar esta vista'}
      aria-label={maximized ? 'Reducir vista' : 'Ampliar vista'}
    >
      {maximized ? '⤡' : '⤢'}
    </button>
  );
}

/**
 * Phone layout (portrait): 2D plan on top and 3D view below with a resizable split, either of them can be
 * enlarged; the mode's panel is a sheet that slides up from the bottom; the modes are a bar at the bottom.
 */
export function CompactWorkspace() {
  const projectId = useProjectStore((state) => state.project.id);
  const mode = useProjectStore((state) => state.mode);
  const selectionKind = useProjectStore((state) => state.selection?.kind ?? null);
  const selectionId = useProjectStore((state) => state.selection?.id ?? null);
  const placing = useProjectStore((state) => state.placingFurniture !== null);
  const [maximized, setMaximized] = useState<View | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [touchActionsStrip, setTouchActionsStrip] = useState<HTMLDivElement | null>(null);

  // Open the sheet when something with details gets selected; close it when a piece starts being placed,
  // so the plan is visible. Adjusted while rendering (React's recommended alternative to an effect).
  const selectionKey = `${selectionKind}:${selectionId}`;
  const [seen, setSeen] = useState({ selectionKey, placing });
  if (seen.selectionKey !== selectionKey || seen.placing !== placing) {
    setSeen({ selectionKey, placing });
    if (placing && !seen.placing) setSheetOpen(false);
    else if (selectionKey !== seen.selectionKey && selectionKind && KINDS_WITH_DETAILS.includes(selectionKind)) {
      setSheetOpen(true);
    }
  }

  const toggle = (view: View) => setMaximized((current) => (current === view ? null : view));

  const plan: ReactNode = (
    <div className="compact-view">
      <ErrorBoundary area="el plano">
        <Editor2D key={projectId} />
      </ErrorBoundary>
      <MaximizeButton maximized={maximized === 'plan'} onClick={() => toggle('plan')} />
    </div>
  );
  const viewer: ReactNode = (
    <div className="compact-view">
      <ErrorBoundary area="la vista 3D">
        <Suspense fallback={<section className="viewer3d viewer3d--loading">Cargando vista 3D…</section>}>
          <Viewer3D onHide={() => setMaximized('plan')} />
        </Suspense>
      </ErrorBoundary>
      <MaximizeButton maximized={maximized === 'viewer3d'} onClick={() => toggle('viewer3d')} />
    </div>
  );

  return (
    <TouchActionsSlot value={touchActionsStrip}>
      <main className="workspace workspace--compact">
        <div className="compact-views">
          {maximized === 'plan' && plan}
          {maximized === 'viewer3d' && viewer}
          {maximized === null && (
            <Group orientation="vertical" className="workspace__panels">
              <Panel id="plan" minSize={140} className="workspace__panel">
                {plan}
              </Panel>
              <Separator className="resize-handle resize-handle--horizontal" />
              <Panel id="viewer3d" defaultSize="40%" minSize={120} className="workspace__panel">
                {viewer}
              </Panel>
            </Group>
          )}

          <BottomSheet title={MODE_PANEL_NAMES[mode]} open={sheetOpen} onToggle={() => setSheetOpen((open) => !open)}>
            <ErrorBoundary area="el panel">
              <ModePanel mode={mode} />
            </ErrorBoundary>
          </BottomSheet>
        </div>

        {/* Buttons for the selection or tool in use: below the views, never covering the plan. */}
        <div className="touch-actions-strip" ref={setTouchActionsStrip} />
        <ModeSwitcher variant="tabbar" />
      </main>
    </TouchActionsSlot>
  );
}

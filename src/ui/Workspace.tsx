import { lazy, Suspense, useState } from 'react';
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  usePanelCallbackRef,
  type PanelImperativeHandle,
} from 'react-resizable-panels';
import { useProjectStore } from '../store/projectStore';
import { Editor2D } from './editor2d/Editor2D';
import { SegmentTable } from './structure/SegmentTable';

// The 3D engine is heavy: load it in its own chunk so the editor appears first.
const Viewer3D = lazy(() => import('./viewer3d/Viewer3D'));

const SIDEBAR_OPEN_KEY = 'arquitect-app:sidebar-open';

function readSidebarOpen(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_OPEN_KEY) !== 'false';
  } catch {
    return true;
  }
}

function saveSidebarOpen(open: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_OPEN_KEY, String(open));
  } catch {
    // Remembering the panel state is only a convenience.
  }
}

/** Panel handle methods throw if called before the group has mounted; skipping then is harmless. */
function togglePanel(panel: PanelImperativeHandle | null) {
  try {
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  } catch {
    // Not mounted yet.
  }
}

/**
 * Workspace: 2D plan | 3D view (resizable, 3D can be hidden) and a fixed-width side panel
 * that is shown or hidden from a tab on the right edge.
 */
export function Workspace() {
  const projectId = useProjectStore((state) => state.project.id);
  const [viewerPanel, setViewerPanel] = usePanelCallbackRef();
  const [viewerCollapsed, setViewerCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'arquitect-app:workspace',
    storage: localStorage,
    onlySaveAfterUserInteractions: true,
  });

  const toggleSidebar = () => {
    setSidebarOpen((open) => {
      saveSidebarOpen(!open);
      return !open;
    });
  };

  return (
    <main className="workspace">
      <Group className="workspace__panels" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>
        <Panel id="plan" minSize={280} className="workspace__panel">
          {/* Remount per project so the view re-fits the new plan. */}
          <Editor2D key={projectId} />
        </Panel>

        <Separator className="resize-handle" />

        <Panel
          id="viewer3d"
          defaultSize="40%"
          minSize={220}
          collapsible
          collapsedSize={0}
          panelRef={setViewerPanel}
          onResize={(size) => setViewerCollapsed(size.inPixels === 0)}
          className="workspace__panel"
        >
          {!viewerCollapsed && (
            <Suspense fallback={<section className="viewer3d viewer3d--loading">Cargando vista 3D…</section>}>
              <Viewer3D onHide={() => togglePanel(viewerPanel)} />
            </Suspense>
          )}
        </Panel>
      </Group>

      <nav className="side-tabs" aria-label="Paneles">
        {viewerCollapsed && (
          <button className="side-tab" onClick={() => togglePanel(viewerPanel)} title="Mostrar la vista 3D">
            Vista 3D
          </button>
        )}
        <button
          className={`side-tab ${sidebarOpen ? 'is-active' : ''}`}
          onClick={toggleSidebar}
          title={sidebarOpen ? 'Ocultar el panel de perímetro' : 'Mostrar el panel de perímetro'}
          aria-expanded={sidebarOpen}
        >
          Perímetro
        </button>
      </nav>

      {sidebarOpen && (
        <aside className="sidebar">
          <SegmentTable />
        </aside>
      )}
    </main>
  );
}

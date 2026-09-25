import { lazy, Suspense, useEffect, useState } from 'react';
import { useProjectStore } from './store/projectStore';
import { Editor2D } from './ui/editor2d/Editor2D';
import { ERROR_MESSAGES } from './ui/errorMessages';
import { useGlobalShortcuts } from './ui/hooks/useGlobalShortcuts';
import { SegmentTable } from './ui/structure/SegmentTable';
import { TopBar } from './ui/TopBar';

const TOAST_MS = 3500;

// The 3D engine is heavy: load it in its own chunk so the editor appears first.
const Viewer3D = lazy(() => import('./ui/viewer3d/Viewer3D'));

export function App() {
  const projectId = useProjectStore((state) => state.project.id);
  const lastError = useProjectStore((state) => state.lastError);
  const clearError = useProjectStore((state) => state.clearError);
  const [message, setMessage] = useState<string | null>(null);

  useGlobalShortcuts();

  useEffect(() => {
    if (!lastError) return;
    const timer = setTimeout(clearError, TOAST_MS);
    return () => clearTimeout(timer);
  }, [lastError, clearError]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div className="app">
      <TopBar onMessage={setMessage} />
      <main className="workspace">
        {/* Remount per project so the view re-fits the new plan. */}
        <Editor2D key={projectId} />
        <Suspense fallback={<section className="viewer3d viewer3d--loading">Cargando vista 3D…</section>}>
          <Viewer3D />
        </Suspense>
        <aside className="sidebar">
          <SegmentTable />
        </aside>
      </main>
      {(lastError || message) && (
        <div className={`toast ${lastError ? 'toast--error' : ''}`} role="status">
          {lastError ? ERROR_MESSAGES[lastError] : message}
        </div>
      )}
    </div>
  );
}

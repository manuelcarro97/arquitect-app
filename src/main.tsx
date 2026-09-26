import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { loadAutosave, startAutosave } from './persistence/autosave';
import { useProjectStore } from './store/projectStore';
import './styles.css';

const autosaved = loadAutosave();
// A project that had no unsaved changes before the reload still has none.
if (autosaved) useProjectStore.getState().loadProject(autosaved.project, { fromFile: autosaved.saved });
startAutosave();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary area="la aplicación">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

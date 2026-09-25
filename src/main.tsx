import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadAutosavedProject, startAutosave } from './persistence/autosave';
import { useProjectStore } from './store/projectStore';
import './styles.css';

const autosaved = loadAutosavedProject();
if (autosaved) useProjectStore.getState().loadProject(autosaved, { fromFile: false });
startAutosave();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

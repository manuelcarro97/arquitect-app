import { useEffect, useState } from 'react';
import { useProjectStore } from './store/projectStore';
import { ERROR_MESSAGES } from './ui/errorMessages';
import { useGlobalShortcuts } from './ui/hooks/useGlobalShortcuts';
import { TopBar } from './ui/TopBar';
import { Workspace } from './ui/Workspace';

const TOAST_MS = 3500;

export function App() {
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
      <Workspace />
      {(lastError || message) && (
        <div className={`toast ${lastError ? 'toast--error' : ''}`} role="status">
          {lastError ? ERROR_MESSAGES[lastError] : message}
        </div>
      )}
    </div>
  );
}

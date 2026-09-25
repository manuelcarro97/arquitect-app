import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** Name of the area shown in the message, e.g. "la vista 3D". */
  area: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches rendering errors in one area of the app so the rest keeps working,
 * and offers to retry or reload instead of leaving a blank page. The project is safe in the autosave.
 * (Error boundaries still have to be class components in React.)
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Error en ${this.props.area}:`, error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="error-boundary" role="alert">
        <strong>Algo ha fallado en {this.props.area}.</strong>
        <p>Tu proyecto está a salvo (se autoguarda). Prueba a reintentar; si sigue fallando, recarga la página.</p>
        <code className="error-boundary__detail">{error.message}</code>
        <div className="button-row">
          <button onClick={() => this.setState({ error: null })}>Reintentar</button>
          <button className="primary-button" onClick={() => window.location.reload()}>
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}

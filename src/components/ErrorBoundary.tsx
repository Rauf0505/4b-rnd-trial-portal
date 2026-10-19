import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Short identifier of the running build, shown so we can tell which bundle is live. */
  buildId?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches any unhandled render error so the portal shows a readable message
 * instead of a blank white screen.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[4B R&D Trial Portal] Unhandled render error', error, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-lg">
          <h1 className="text-lg font-bold text-gray-900">Something went wrong</h1>
          <p className="mt-1 text-sm text-gray-600">
            The portal hit an unexpected error while rendering. Reload to try again; if it keeps
            happening, share the details below.
          </p>
          <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-left text-[11px] leading-snug text-red-800">
            {error.message || String(error)}
          </pre>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-4 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Reload
          </button>
          {this.props.buildId && (
            <p className="mt-3 text-[11px] text-gray-400">build {this.props.buildId}</p>
          )}
        </div>
      </div>
    );
  }
}

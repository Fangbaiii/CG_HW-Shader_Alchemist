import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-red-900/80 text-white p-10 z-50">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
            <p className="mb-4">The application encountered an error and could not render the 3D scene.</p>
            <div className="bg-black/50 p-4 rounded overflow-auto max-h-60 font-mono text-sm">
              {this.state.error?.toString()}
            </div>
            <button 
              className="mt-6 px-4 py-2 bg-white text-black font-bold rounded hover:bg-gray-200"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

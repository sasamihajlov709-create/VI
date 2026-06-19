import React, { ErrorInfo, ReactNode } from 'react';
import { logger } from '../lib/logger';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('React Error Boundary Caught', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-white p-6">
          <div className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-2xl p-6 text-center shadow-2xl">
            <h2 className="text-xl font-semibold mb-2 text-red-400">Something went wrong.</h2>
            <p className="text-sm text-slate-400 mb-6">
              An unexpected error occurred in this view.
            </p>
            <div className="bg-black/50 border border-white/5 rounded-lg p-4 text-left overflow-auto max-h-48 mb-6">
              <pre className="text-[10px] font-mono text-red-300 whitespace-pre-wrap break-words">
                {this.state.error?.message}
                {'\n'}
                {this.state.error?.stack}
              </pre>
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="py-2 px-6 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-lg transition-colors text-sm font-medium"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

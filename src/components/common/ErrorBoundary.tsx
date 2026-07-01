/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('⚠️ OpenComm Caught Error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-slate-950">
          <div className="max-w-md bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-8 shadow-sm flex flex-col items-center gap-5">
            <div className="h-12 w-12 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            
            <div className="flex flex-col gap-2">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Something went wrong
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                An unexpected application crash occurred. OpenComm's secure sandbox contained the error safely.
              </p>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="w-full text-left bg-gray-50 dark:bg-slate-950 p-4 rounded-lg border border-gray-100 dark:border-slate-800 text-xs font-mono text-red-600 dark:text-red-400 overflow-x-auto max-h-36">
                {this.state.error.stack || this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

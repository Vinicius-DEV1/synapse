import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] Caught error in ${this.props.moduleName || 'component'}:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-dark-bg">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-400">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Algo deu errado</h2>
          <p className="text-sm text-dark-subtext max-w-md mb-6">
            Um erro inesperado ocorreu no módulo {this.props.moduleName ? `"${this.props.moduleName}"` : 'da aplicação'}.
            {this.state.error && (
              <span className="block mt-2 font-mono text-xs opacity-50 bg-black/20 p-2 rounded truncate max-w-[300px] mx-auto">
                {this.state.error.message}
              </span>
            )}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 active:scale-95 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-brand-500/20"
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

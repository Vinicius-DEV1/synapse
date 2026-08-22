import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Optionally reload page if error persists:
    // window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex flex-col items-center justify-center bg-dark-bg text-dark-text p-4">
          <div className="bg-dark-card border border-red-500/30 p-8 rounded-2xl max-w-lg w-full text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 text-red-500">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-4">Ops! Algo deu errado.</h1>
            <p className="text-dark-subtext mb-8">
              Ocorreu um erro inesperado no aplicativo. Suas informações estão a salvo.
            </p>
            
            <div className="text-left w-full bg-black/30 p-4 rounded-lg overflow-auto max-h-32 mb-8 text-xs font-mono text-red-400">
              {this.state.error?.toString()}
            </div>

            <div className="flex gap-4">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-6 py-2 bg-brand-600 hover:bg-brand-500 text-white font-medium rounded-lg transition-colors"
              >
                <RefreshCw size={18} />
                Tentar Novamente
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 text-white font-medium rounded-lg transition-colors"
              >
                Recarregar App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

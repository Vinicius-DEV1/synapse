import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  moduleName?: string;
  pageId?: string | null;
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
    const isChunkError = this.state.error?.message?.includes('dynamically imported') || 
                         this.state.error?.message?.includes('Failed to fetch') ||
                         this.state.error?.message?.includes('Loading chunk') ||
                         this.state.error?.name === 'ChunkLoadError';
    if (isChunkError) {
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null });
  };

  // Detect CRDT/schema-corruption crashes
  private isCrdtError = () => {
    const msg = this.state.error?.message || '';
    return (
      msg.includes('trim is not a function') ||
      msg.includes("t.cached") ||
      msg.includes('fromSchema') ||
      msg.includes('XmlFragment')
    );
  };

  // Clear the CRDT state for the current page and reload
  private handleClearCrdt = async () => {
    try {
      // Clear any persisted CRDT from sessionStorage/localStorage
      Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('crdt_') || k.startsWith('yjs_')) sessionStorage.removeItem(k);
      });
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('crdt_') || k.startsWith('yjs_')) localStorage.removeItem(k);
      });

      if (window.__cadernoEditorBackup) {
        window.__cadernoEditorBackup.clear();
      }

      if (this.props.pageId && window.api?.updatePage) {
        await window.api.updatePage({ id: this.props.pageId, crdt_state: null });
      }
    } catch (_) { /* noop */ }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isCrdt = this.isCrdtError();

      return (
        <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-8 text-center bg-dark-bg">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-400">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Algo deu errado</h2>
          <p className="text-sm text-dark-subtext max-w-md mb-2">
            {isCrdt
              ? 'O conteúdo desta página pode estar em um formato incompatível com a versão atual.'
              : `Um erro inesperado ocorreu no módulo ${this.props.moduleName ? `"${this.props.moduleName}"` : 'da aplicação'}.`}
            {this.state.error && (
              <span className="block mt-2 font-mono text-xs opacity-50 bg-black/20 p-2 rounded truncate max-w-[300px] mx-auto">
                {this.state.error.message}
              </span>
            )}
          </p>
          {isCrdt && (
            <p className="text-xs text-dark-subtext/60 max-w-sm mb-5">
              Clique em <strong className="text-yellow-400">Recuperar Página</strong> para tentar restaurar o conteúdo a partir do HTML salvo.
              O histórico de colaboração (CRDT) será descartado.
            </p>
          )}
          <div className="flex items-center gap-3">
            {isCrdt && (
              <button
                onClick={this.handleClearCrdt}
                className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 active:scale-95 text-yellow-300 rounded-xl text-sm font-medium transition-all"
              >
                <RefreshCw size={16} />
                Recuperar Página
              </button>
            )}
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 active:scale-95 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-brand-500/20"
            >
              <RefreshCw size={16} />
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

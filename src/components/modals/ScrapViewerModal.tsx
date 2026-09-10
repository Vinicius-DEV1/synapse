import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Globe, 
  ExternalLink, 
  Loader2, 
  AlertCircle, 
  ZoomIn, 
  ZoomOut, 
  Printer, 
  ShieldCheck,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react';
import { getDecryptedScrap } from '../../services/scrap/scrap-storage';
import { useStore } from '../../store/useStore';

export interface ScrapViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scrapData: {
    scrapId: string;
    url: string;
    title: string;
    driveFileId?: string | null;
    localPath?: string | null;
    fileSize?: number | null;
    createdAt?: string;
  } | null;
}

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export function ScrapViewerModal({
  isOpen,
  onClose,
  scrapData,
}: ScrapViewerModalProps) {
  const { state } = useStore();
  const masterKey = state.moduleKeys['notes'] || state.moduleKeys['files'];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [zoom, setZoom] = useState(100);
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen || !scrapData) {
      setHtmlContent('');
      setError(null);
      setZoom(100);
      setViewportMode('desktop');
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    getDecryptedScrap(
      scrapData.scrapId,
      scrapData.driveFileId,
      scrapData.localPath,
      masterKey
    )
      .then((content) => {
        if (!active) return;
        setHtmlContent(content);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('[ScrapViewer] Erro ao carregar snapshot:', err);
        setError(err.message || 'Falha ao carregar e decriptografar snapshot');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, scrapData, masterKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !scrapData) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoom(100);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  };

  const handleOpenLive = () => {
    window.open(scrapData.url, '_blank', 'noopener,noreferrer');
  };

  const cleanDomain = (() => {
    try {
      return new URL(scrapData.url).hostname.replace(/^www\./, '');
    } catch {
      return scrapData.url;
    }
  })();

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex flex-col bg-dark-bg text-dark-text animate-fade-in w-screen h-screen overflow-hidden">
      {/* Barra de Ferramentas Superior */}
      <header className="h-14 px-4 bg-dark-surface/95 border-b border-white/10 flex items-center justify-between gap-4 shrink-0 shadow-lg backdrop-blur-md z-50">
        {/* Lado Esquerdo: Info da Página */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center shrink-0 text-brand-primary">
            <Globe size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white truncate max-w-[280px] sm:max-w-md" title={scrapData.title}>
                {scrapData.title || cleanDomain}
              </h3>
              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 border border-emerald-500/20">
                <ShieldCheck size={11} /> Snapshot Offline
              </span>
            </div>
            <span className="text-[11px] text-dark-subtext font-mono truncate block" title={scrapData.url}>
              {scrapData.url}
            </span>
          </div>
        </div>

        {/* Lado Direito: Modos de Responsividade, Zoom e Ações */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Seletor de Responsividade (Desktop / Tablet / Mobile) */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setViewportMode('desktop')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewportMode === 'desktop' ? 'bg-brand-primary text-white shadow-sm' : 'text-dark-subtext hover:text-white hover:bg-white/10'
              }`}
              title="Visualização Desktop (Largura Total)"
            >
              <Monitor size={14} />
            </button>
            <button
              onClick={() => setViewportMode('tablet')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewportMode === 'tablet' ? 'bg-brand-primary text-white shadow-sm' : 'text-dark-subtext hover:text-white hover:bg-white/10'
              }`}
              title="Visualização Tablet (768px)"
            >
              <Tablet size={14} />
            </button>
            <button
              onClick={() => setViewportMode('mobile')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewportMode === 'mobile' ? 'bg-brand-primary text-white shadow-sm' : 'text-dark-subtext hover:text-white hover:bg-white/10'
              }`}
              title="Visualização Mobile (390px)"
            >
              <Smartphone size={14} />
            </button>
          </div>

          {/* Controles de Zoom */}
          <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5 text-xs">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-colors"
              title="Diminuir Zoom"
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 font-mono text-[11px] text-dark-text hover:text-brand-primary transition-colors"
              title="Resetar Zoom"
            >
              {zoom}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-colors"
              title="Aumentar Zoom"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Imprimir */}
          <button
            onClick={handlePrint}
            disabled={loading || !!error}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white border border-white/5 transition-colors disabled:opacity-30"
            title="Imprimir / Exportar Snapshot em PDF"
          >
            <Printer size={16} />
          </button>

          {/* Abrir ao Vivo */}
          <button
            onClick={handleOpenLive}
            className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Acessar página ao vivo no navegador"
          >
            <ExternalLink size={13} />
            <span className="hidden lg:inline">Página ao Vivo</span>
          </button>

          {/* Fechar */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-dark-subtext hover:text-rose-300 transition-colors"
            title="Fechar Visualizador (Esc)"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Área Principal de Renderização */}
      <main className="flex-1 relative overflow-auto bg-[#18181b] flex justify-center items-stretch p-0">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-bg/90 backdrop-blur-sm z-20">
            <Loader2 size={36} className="text-brand-primary animate-spin mb-3" />
            <p className="text-sm text-dark-subtext font-medium animate-pulse">
              Carregando e decriptografando snapshot seguro...
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
              <AlertCircle size={32} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Não foi possível exibir o snapshot</h4>
            <p className="text-sm text-dark-subtext max-w-md mb-6 leading-relaxed">
              {error}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleOpenLive}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-hover text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-brand-primary/20"
              >
                <ExternalLink size={15} />
                Abrir Página ao Vivo no Navegador
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white border border-white/10 rounded-xl text-sm font-medium transition-colors"
              >
                Voltar à Nota
              </button>
            </div>
          </div>
        )}

        {!loading && !error && htmlContent && (
          <div className="w-full h-full flex justify-center items-start overflow-auto p-0">
            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              title={scrapData.title || 'Web Snapshot'}
              sandbox="allow-scripts allow-forms allow-popups"
              className="border-none bg-white transition-all duration-300 shadow-2xl"
              style={{
                width: viewportMode === 'mobile' ? '390px' : viewportMode === 'tablet' ? '768px' : '100%',
                maxWidth: '100%',
                minHeight: '100%',
                height: '100%',
                zoom: `${zoom}%`,
                borderRadius: viewportMode !== 'desktop' ? '16px' : '0px',
                margin: viewportMode !== 'desktop' ? '16px auto' : '0',
              }}
            />
          </div>
        )}

        {/* Botão Flutuante de Fechar (Garante saída rápida em qualquer rolagem) */}
        <button
          onClick={onClose}
          className="fixed bottom-6 right-6 z-[999999] px-4 py-3 rounded-2xl bg-dark-card/95 hover:bg-rose-600 text-white shadow-2xl border border-white/20 backdrop-blur-md transition-all duration-200 hover:scale-105 group flex items-center gap-2 font-medium text-xs cursor-pointer"
          title="Fechar Visualizador (Esc)"
        >
          <X size={16} />
          <span>Fechar (Esc)</span>
        </button>
      </main>
    </div>
  );

  return createPortal(modalContent, document.body);
}

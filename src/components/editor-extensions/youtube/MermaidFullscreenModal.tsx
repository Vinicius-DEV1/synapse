import { useEffect, useState, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Network,
  Maximize,
  Copy,
  Check,
} from 'lucide-react';
import { Portal } from '../../ui/Portal';
import { triggerToast } from '../../ui/ToastContext';

interface MermaidFullscreenModalProps {
  svgContent: string;
  chartCode: string;
  onClose: () => void;
}

export function MermaidFullscreenModal({
  svgContent,
  chartCode,
  onClose,
}: MermaidFullscreenModalProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key or zoom with keys (using capture phase so parent modals do not close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setZoom((prev) => Math.min(3, +(prev + 0.15).toFixed(2)));
      } else if (e.key === '-' || e.key === '_') {
        setZoom((prev) => Math.max(0.3, +(prev - 0.15).toFixed(2)));
      } else if (e.key === '0') {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  // Pan interaction
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  }, [pan]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom via wheel with Ctrl or trackpad pinch
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((prev) => Math.min(3, Math.max(0.3, +(prev + delta).toFixed(2))));
    } else {
      // Normal wheel pans vertically/horizontally
      setPan((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, []);

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFit = () => {
    setZoom(0.85);
    setPan({ x: 0, y: 0 });
  };

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(chartCode.trim());
      }
      setCopied(true);
      triggerToast('Código Mermaid copiado!', 'info', 2000);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      triggerToast('Falha ao copiar código.', 'error');
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[300] bg-dark-bg/95 backdrop-blur-md flex flex-col animate-fade-in select-none">
        {/* Fullscreen Header */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-5 sm:px-8 bg-dark-bg/90 backdrop-blur-md z-30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/30">
              <Network size={16} />
            </div>
            <div>
              <h3 className="text-zinc-100 font-medium text-sm">
                Diagrama Conceitual em Tela Cheia
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Arraste para mover • Ctrl + Scroll para zoom
              </p>
            </div>
          </div>

          {/* Floating Zoom & Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center bg-white/5 border border-white/5 rounded-lg p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.3, +(prev - 0.15).toFixed(2)))}
                className="p-1.5 rounded-md hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Diminuir Zoom (-)"
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-1 text-xs font-mono font-medium text-zinc-300 hover:text-white transition-colors rounded-md hover:bg-white/10 cursor-pointer min-w-[52px] text-center"
                title="Resetar Zoom (0)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3, +(prev + 0.15).toFixed(2)))}
                className="p-1.5 rounded-md hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                title="Aumentar Zoom (+)"
              >
                <ZoomIn size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleFit}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-white/5"
              title="Ajustar visualização"
            >
              <Maximize size={14} />
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-white/5"
              title="Centralizar diagrama"
            >
              <RotateCcw size={14} />
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-white/5"
              title="Copiar código Mermaid"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-2 cursor-pointer flex items-center gap-1.5"
              title="Fechar tela cheia (Esc)"
            >
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono text-zinc-400">
                Esc
              </kbd>
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Interactive Pan & Zoom Canvas */}
        <main
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className={`flex-1 w-full h-full overflow-hidden relative flex items-center justify-center ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.08s ease-out',
            }}
            className="mermaid-svg-container select-none pointer-events-none [&_svg]:max-w-none [&_svg]:h-auto [&_svg]:drop-shadow-2xl"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        </main>
      </div>
    </Portal>
  );
}

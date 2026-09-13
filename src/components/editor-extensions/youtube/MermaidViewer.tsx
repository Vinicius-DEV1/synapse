import { useEffect, useState, useId } from 'react';
import { Network, Code2, Eye, Copy, Check, AlertTriangle } from 'lucide-react';
import { triggerToast } from '../../ui/ToastContext';
import { ScrollableDiv, ScrollablePre } from '../../../utils/scroll-forwarding';

interface MermaidViewerProps {
  chart: string;
}

let mermaidInitialized = false;

export default function MermaidViewer({ chart }: MermaidViewerProps) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const rawId = useId();
  const diagramId = `mermaid-${rawId.replace(/[:]/g, '')}`;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function renderChart() {
      try {
        const mermaid = (await import('mermaid')).default;
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            themeVariables: {
              darkMode: true,
              background: '#141416',
              primaryColor: '#3b82f6',
              primaryTextColor: '#f4f4f5',
              primaryBorderColor: '#60a5fa',
              lineColor: '#a1a1aa',
              secondaryColor: '#27272a',
              tertiaryColor: '#18181b',
              fontFamily: 'inherit',
              fontSize: '13px',
            },
            securityLevel: 'loose',
          });
          mermaidInitialized = true;
        }

        const trimmedChart = chart.trim();
        if (!trimmedChart) {
          if (isMounted) {
            setSvgContent('');
            setLoading(false);
          }
          return;
        }

        const { svg } = await mermaid.render(diagramId, trimmedChart);
        if (isMounted) {
          setSvgContent(svg);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn('[MermaidViewer] Error rendering diagram:', errMsg);
          setError(errMsg);
          setLoading(false);
        }
      }
    }

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, diagramId]);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(chart.trim());
      } else {
        const ta = document.createElement('textarea');
        ta.value = chart.trim();
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      triggerToast('Código Mermaid copiado!', 'info', 2000);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      triggerToast('Falha ao copiar código.', 'error');
    }
  };

  return (
    <div className="my-6 rounded-2xl border border-white/10 bg-[#121215] overflow-hidden shadow-lg transition-all duration-200">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/5 text-xs text-zinc-400 select-none">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <Network size={12} />
          </div>
          <span className="font-medium text-zinc-200">Diagrama Conceitual (Mermaid)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowCode((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer text-[11px] font-medium"
            title={showCode ? 'Ver diagrama visual' : 'Ver código Mermaid'}
          >
            {showCode ? (
              <>
                <Eye size={12} />
                <span>Ver Diagrama</span>
              </>
            ) : (
              <>
                <Code2 size={12} />
                <span>Código</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Copiar código Mermaid"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Content body */}
      <ScrollableDiv className="p-4 sm:p-6 flex items-center justify-center min-h-[140px] overflow-x-auto custom-scrollbar">
        {showCode ? (
          <ScrollablePre className="w-full text-xs font-mono text-zinc-300 bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto leading-relaxed">
            <code>{chart.trim()}</code>
          </ScrollablePre>
        ) : loading ? (
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            <span>Renderizando diagrama...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-center p-4 text-xs text-zinc-400 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-medium">
              <AlertTriangle size={15} />
              <span>Não foi possível renderizar o gráfico visual</span>
            </div>
            <ScrollablePre className="text-left w-full text-[11px] font-mono text-zinc-400 bg-black/40 p-3 rounded-lg border border-white/5 overflow-x-auto">
              <code>{chart.trim()}</code>
            </ScrollablePre>
          </div>
        ) : (
          <div
            className="mermaid-svg-container w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto transition-all"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </ScrollableDiv>
    </div>
  );
}

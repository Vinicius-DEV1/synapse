import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  Bot,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Portal } from '../../ui/Portal';
import { triggerToast } from '../../ui/ToastContext';
import {
  generateYouTubeSummary,
  getExistingVideoSummary,
  extractYouTubeVideoId,
} from '../../../services/youtube/youtubeSummaryService';

interface YouTubeSummaryModalProps {
  url: string;
  title?: string | null;
  channel?: string | null;
  onClose: () => void;
}

export default function YouTubeSummaryModal({
  url,
  title,
  channel,
  onClose,
}: YouTubeSummaryModalProps) {
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Buscando legendas do vídeo...');
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [rawTranscript, setRawTranscript] = useState<string | null>(null);
  const [showRawTranscript, setShowRawTranscript] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const videoId = extractYouTubeVideoId(url);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    isMountedRef.current = true;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      isMountedRef.current = false;
      window.removeEventListener('keydown', handleKeyDown);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, [handleClose]);

  const loadSummary = useCallback(
    async (forceRegenerate = false) => {
      if (!url) return;

      setError(null);
      if (forceRegenerate) {
        setIsRegenerating(true);
        setStatusMessage('Reanalisando legendas e gerando novo resumo didático...');
      } else {
        // Fast in-memory / SQLite check (0ms perceived latency if already saved)
        if (videoId) {
          const cached = await getExistingVideoSummary(videoId);
          if (cached && cached.summary) {
            setSummary(cached.summary);
            setRawTranscript(cached.raw_transcript || null);
            setLoading(false);
            return;
          }
        }
        setLoading(true);
        setStatusMessage('Extraindo transcrição e legendas do vídeo...');
      }

      try {
        // Switch status after initial subtitle fetch begins
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setStatusMessage('A Inteligência Artificial está elaborando o resumo com minutagens...');
          }
        }, 2200);

        const result = await generateYouTubeSummary({
          url,
          title,
          channel,
          forceRegenerate,
        });

        if (statusTimerRef.current) {
          clearTimeout(statusTimerRef.current);
          statusTimerRef.current = null;
        }

        if (!isMountedRef.current) return;

        setSummary(result.summary);
        setRawTranscript(result.record.raw_transcript || null);
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      } finally {
        if (statusTimerRef.current) {
          clearTimeout(statusTimerRef.current);
          statusTimerRef.current = null;
        }
        if (isMountedRef.current) {
          setLoading(false);
          setIsRegenerating(false);
        }
      }
    },
    [url, title, channel, videoId]
  );

  useEffect(() => {
    loadSummary(false);
  }, [loadSummary]);

  const handleCopySummary = async () => {
    if (!summary) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(summary);
      } else {
        const ta = document.createElement('textarea');
        ta.value = summary;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      triggerToast('Resumo copiado com sucesso!', 'info', 2500);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) setCopied(false);
      }, 2000);
    } catch {
      triggerToast('Não foi possível copiar o resumo.', 'error');
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300">
        <div className="bg-[#18181B]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)] w-full max-w-3xl overflow-hidden flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-brand-500/15 flex items-center justify-center border border-brand-500/30 text-brand-400 shadow-inner shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white/95 tracking-wide truncate max-w-md">
                    {title || 'Resumo do Vídeo'}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-500/10 text-brand-300 border border-brand-500/20 shrink-0">
                    <Bot size={10} />
                    IA Didática
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5">
                  {channel && <span className="truncate">{channel}</span>}
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-300/80 hover:text-brand-300 transition-colors hover:underline text-[11px]"
                    >
                      <ExternalLink size={10} />
                      Assistir no YouTube
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {summary && !loading && (
                <>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    disabled={isRegenerating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-medium border border-white/5 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    title="Copiar resumo formatado"
                  >
                    {copied ? (
                      <>
                        <Check size={13} className="text-emerald-400 stroke-[2.5]" />
                        <span className="text-emerald-300">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} className="text-zinc-400" />
                        <span>Copiar Resumo</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => loadSummary(true)}
                    disabled={isRegenerating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 text-xs font-medium border border-brand-500/30 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    title="Regenerar o resumo usando a IA novamente"
                  >
                    <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />
                    <span>{isRegenerating ? 'Regenerando...' : 'Regenerar'}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors ml-1 cursor-pointer"
                title="Fechar (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-4">
                <div className="relative mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 animate-pulse">
                    <Sparkles size={28} />
                  </div>
                  <Loader2
                    size={20}
                    className="animate-spin text-brand-400 absolute -top-1 -right-1"
                  />
                </div>
                <p className="text-sm font-medium text-white/90 mb-1">{statusMessage}</p>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Filtrando ruídos, vinhetas e propagandas para focar 100% no conteúdo didático e nas
                  minutagens do vídeo.
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-sm font-semibold text-rose-200 mb-1">
                  Não foi possível gerar o resumo
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mb-4 leading-relaxed">{error}</p>
                <button
                  type="button"
                  onClick={() => loadSummary(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : summary ? (
              <div className="prose prose-invert max-w-none text-zinc-200 text-sm leading-relaxed space-y-4">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold text-white mb-3 mt-1 pb-2 border-b border-white/10">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-semibold text-brand-300 mt-5 mb-2.5 flex items-center gap-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold text-white/90 mt-4 mb-2">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => <p className="mb-2 leading-relaxed text-zinc-300">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5 text-zinc-300">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5 text-zinc-300">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-brand-500/50 pl-3 my-2 text-zinc-400 italic bg-brand-500/[0.03] py-1 rounded-r">
                        {children}
                      </blockquote>
                    ),
                    code: ({ className, children }) => {
                      const match = /language-(\w+)/.exec(className || '');
                      const isBlock = Boolean(match || String(children).includes('\n'));
                      if (isBlock) {
                        return (
                          <pre className="bg-black/40 border border-white/10 rounded-xl p-3.5 my-2.5 overflow-x-auto text-xs font-mono text-zinc-200 custom-scrollbar">
                            <code>{children}</code>
                          </pre>
                        );
                      }
                      return (
                        <code className="bg-white/10 text-brand-200 px-1.5 py-0.5 rounded text-xs font-mono">
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {summary}
                </ReactMarkdown>

                {/* Collapsible raw transcript inspection section */}
                {rawTranscript && (
                  <div className="mt-8 pt-4 border-t border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setShowRawTranscript((prev) => !prev)}
                      className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors cursor-pointer text-xs font-medium text-zinc-400 hover:text-zinc-200"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-zinc-400" />
                        <span>Transcrição Original com Minutagens</span>
                      </div>
                      {showRawTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showRawTranscript && (
                      <div className="mt-2 p-4 rounded-xl bg-black/40 border border-white/5 max-h-72 overflow-y-auto custom-scrollbar text-xs font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap select-text">
                        {rawTranscript}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Footer Info */}
          <div className="px-5 py-2.5 border-t border-white/[0.08] bg-white/[0.01] flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-zinc-500" />
              <span>Resumos salvos localmente abrem instantaneamente em consultas futuras</span>
            </div>
            <span className="text-zinc-500">Pressione Esc para fechar</span>
          </div>
        </div>
      </div>
    </Portal>
  );
}

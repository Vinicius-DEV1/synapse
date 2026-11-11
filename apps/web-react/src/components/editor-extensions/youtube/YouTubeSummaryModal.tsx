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
  Sun,
  Moon,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import MermaidViewer from './MermaidViewer';
import { ScrollablePre, ScrollableDiv } from '../../../utils/scroll-forwarding';
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
  const [framesCount, setFramesCount] = useState<number | undefined>(undefined);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('caderno_summary_dark_mode') === 'true';
  });
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    localStorage.setItem('caderno_summary_dark_mode', String(darkMode));
  }, [darkMode]);

  const videoId = extractYouTubeVideoId(url);

  const wordCount = summary?.trim() ? summary.trim().split(/\s+/).length : 0;
  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 180));

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    isMountedRef.current = true;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
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
          onProgress: (msg) => {
            if (isMountedRef.current) setStatusMessage(msg);
          },
        });

        if (statusTimerRef.current) {
          clearTimeout(statusTimerRef.current);
          statusTimerRef.current = null;
        }

        if (!isMountedRef.current) return;

        setSummary(result.summary);
        setRawTranscript(result.record.raw_transcript || null);
        setFramesCount(result.framesAnalyzed);
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
      <div
        className={`fixed inset-0 z-[200] flex flex-col animate-fade-in select-text transition-colors duration-200 ${
          darkMode ? 'bg-black text-zinc-100' : 'bg-dark-bg text-zinc-200'
        }`}
      >
        {/* Sticky Minimalist Header (Matching FileViewer / Markdown Reader) */}
        <header
          className={`h-14 border-b border-white/5 flex items-center justify-between px-5 sm:px-8 backdrop-blur-md z-30 sticky top-0 shrink-0 transition-colors duration-200 ${
            darkMode ? 'bg-black/90' : 'bg-dark-bg/90'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0 border border-brand-500/20">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-zinc-100 font-medium text-sm truncate max-w-[200px] sm:max-w-md md:max-w-lg">
                  {title || 'Resumo do Vídeo'}
                </h2>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-mono font-semibold rounded bg-brand-500/10 text-brand-300 border border-brand-500/20 shrink-0">
                  {framesCount && framesCount > 0 ? `RESUMO IA • ${framesCount} FRAMES` : 'RESUMO IA'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-2 font-mono mt-0.5 flex-wrap">
                {channel && (
                  <>
                    <span className="text-zinc-300 truncate max-w-[150px]">{channel}</span>
                    <span>•</span>
                  </>
                )}
                {wordCount > 0 ? (
                  <>
                    <span>{wordCount} palavras</span>
                    <span>•</span>
                    <span>~{estimatedMinutes} min de leitura</span>
                  </>
                ) : (
                  <span>{framesCount && framesCount > 0 ? 'Visão Computacional & Minutagens' : 'Didático & Minutado'}</span>
                )}
                {url && (
                  <>
                    <span>•</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-300 hover:text-brand-200 transition-colors hover:underline"
                    >
                      <ExternalLink size={10} />
                      <span>Assistir no YouTube</span>
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {summary && !loading && (
              <>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  disabled={isRegenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 text-xs font-medium border border-white/5 transition-all cursor-pointer disabled:opacity-40 shadow-xs"
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 text-brand-300 text-xs font-medium border border-brand-500/30 transition-all cursor-pointer disabled:opacity-40 shadow-xs"
                  title="Regenerar o resumo usando a IA novamente"
                >
                  <RefreshCw size={13} className={isRegenerating ? 'animate-spin' : ''} />
                  <span>{isRegenerating ? 'Regenerando...' : 'Regenerar'}</span>
                </button>
              </>
            )}

            {/* Dark Mode Toggle (Identical to Markdown / FileViewer) */}
            <button
              type="button"
              onClick={() => setDarkMode((prev) => !prev)}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={darkMode ? 'Modo Normal (Fundo Caderno)' : 'Modo Escuro / Noturno'}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-1 cursor-pointer flex items-center gap-1.5"
              title="Fechar tela de foco (Esc)"
            >
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono text-zinc-400">
                Esc
              </kbd>
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Focus Reading Viewport */}
        <main className="flex-1 overflow-y-auto custom-scrollbar w-full">
          <div className="max-w-3xl mx-auto px-6 py-10 sm:px-12 sm:py-16">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
                <div className="relative mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 animate-pulse">
                    <Sparkles size={28} />
                  </div>
                  <Loader2
                    size={20}
                    className="animate-spin text-brand-400 absolute -top-1 -right-1"
                  />
                </div>
                <p className="text-base font-medium text-white/90 mb-1.5">{statusMessage}</p>
                <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                  Filtrando ruídos, vinhetas e propagandas para focar 100% no conteúdo didático e nas
                  minutagens do vídeo.
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3">
                  <AlertCircle size={24} />
                </div>
                <h3 className="text-base font-semibold text-rose-200 mb-1">
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
              <div className="space-y-6">
                <div className="prose prose-invert max-w-none text-zinc-200 text-sm sm:text-base leading-relaxed space-y-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 mt-2 pb-3 border-b border-white/10 tracking-tight">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg sm:text-xl font-semibold text-brand-300 mt-8 mb-3 flex items-center gap-2 tracking-tight">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base sm:text-lg font-semibold text-white/90 mt-6 mb-2.5">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => <p className="mb-3 leading-relaxed text-zinc-300">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-2 text-zinc-300">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-zinc-300">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-brand-500/60 pl-4 py-1.5 my-4 text-zinc-300 italic bg-brand-500/[0.04] rounded-r-lg">
                          {children}
                        </blockquote>
                      ),
                      details: ({ children, ...props }) => (
                        <details
                          {...props}
                          className="group/details my-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.035] transition-all duration-200 overflow-hidden open:border-brand-500/30 open:bg-brand-500/[0.02] open:shadow-md"
                        >
                          {children}
                        </details>
                      ),
                      summary: ({ children, ...props }) => (
                        <summary
                          {...props}
                          className="px-4 py-3 cursor-pointer text-xs sm:text-sm font-medium text-white/90 select-none flex items-center justify-between list-none [&::-webkit-details-marker]:hidden hover:text-white transition-colors"
                        >
                          <span className="flex items-center gap-2 flex-1">{children}</span>
                          <ChevronDown
                            size={15}
                            className="text-zinc-400 group-open/details:rotate-180 transition-transform duration-200 shrink-0 ml-2"
                          />
                        </summary>
                      ),
                      code: ({ className, children }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const lang = match ? match[1] : '';
                        if (lang === 'mermaid') {
                          return <MermaidViewer chart={String(children)} />;
                        }
                        const isBlock = Boolean(match || String(children).includes('\n'));
                        if (isBlock) {
                          return (
                            <ScrollablePre className="bg-[#141416] border border-white/5 rounded-xl p-4 sm:p-5 my-4 overflow-x-auto text-xs sm:text-sm font-mono text-zinc-200 custom-scrollbar leading-relaxed">
                              <code>{children}</code>
                            </ScrollablePre>
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
                </div>

                {/* Collapsible raw transcript inspection section */}
                {rawTranscript && (
                  <div className="mt-12 pt-6 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => setShowRawTranscript((prev) => !prev)}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 transition-colors cursor-pointer text-xs font-medium text-zinc-400 hover:text-zinc-200"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-zinc-400" />
                        <span>Transcrição Original com Minutagens</span>
                      </div>
                      {showRawTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showRawTranscript && (
                      <ScrollableDiv className="mt-3 p-4 sm:p-5 rounded-xl bg-black/40 border border-white/5 max-h-80 overflow-y-auto custom-scrollbar text-xs font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap select-text">
                        {rawTranscript}
                      </ScrollableDiv>
                    )}
                  </div>
                )}

                {/* Footer metadata reminder */}
                <div className="mt-12 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-zinc-500" />
                    <span>Resumo salvo localmente para leitura instantânea offline</span>
                  </div>
                  <span>Pressione Esc para fechar</span>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </Portal>
  );
}

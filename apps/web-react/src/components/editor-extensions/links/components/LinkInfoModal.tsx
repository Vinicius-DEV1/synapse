import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  StickyNote,
  AlertCircle,
  Video,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import MermaidViewer from '../../youtube/MermaidViewer';
import { Portal } from '../../../ui/Portal';
import { triggerToast } from '../../../ui/ToastContext';
import { getOrGenerateLinkInfo, type LinkInfoResult } from '../../../../services/link-info/linkInfoService';
import { playUiClickSound, playUiActionSound } from '../../../../utils/uiSounds';
import { getLinkEntitySync } from '../../../../services/link-vault/linkVaultService';

interface LinkInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string | null;
  scrapId?: string | null;
  scrapDriveFileId?: string | null;
  scrapLocalPath?: string | null;
  masterKey?: CryptoKey;
  initialSummary?: string | null;
  onSaveSummary?: (summary: string) => void;
  onInsertIntoNotes?: (summaryText: string) => void;
}

export default function LinkInfoModal({
  isOpen,
  onClose,
  url,
  title: initialTitle,
  scrapId,
  scrapDriveFileId,
  scrapLocalPath,
  masterKey,
  initialSummary,
  onSaveSummary,
  onInsertIntoNotes,
}: LinkInfoModalProps) {
  // Synchronously resolve any existing cached summary for 0ms initial render
  const syncCachedSummary = initialSummary || getLinkEntitySync(url)?.aiSummary || null;

  const [loading, setLoading] = useState<boolean>(!syncCachedSummary);
  const [statusMessage, setStatusMessage] = useState<string>(
    syncCachedSummary ? 'Carregando resumo salvo...' : 'Analisando recurso web...'
  );
  const [error, setError] = useState<string | null>(null);
  const [infoResult, setInfoResult] = useState<LinkInfoResult | null>(() => {
    if (syncCachedSummary) {
      const domain = (() => {
        try {
          return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        } catch {
          return '';
        }
      })();

      return {
        url,
        title: initialTitle || domain || url,
        domain,
        summary: syncCachedSummary,
        distilled: {
          title: initialTitle || domain || url,
          cleanText: '',
          embeddedYouTubeVideoIds: [],
          keyImages: [],
          keyOutboundLinks: [],
          wordCount: 0,
        },
        hasVideoTranscript: false,
        isCached: true,
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  });

  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const fetchInfo = useCallback(
    async (forceRegenerate = false) => {
      if (!url) return;
      setError(null);
      setCopied(false);
      setInserted(false);

      if (!forceRegenerate) {
        // If already populated from sync cache, ensure loading is false and skip re-querying
        const fastCached = initialSummary || getLinkEntitySync(url)?.aiSummary || null;
        if (fastCached) {
          if (isMountedRef.current) {
            setLoading(false);
            setInfoResult((prev) => {
              if (prev && prev.summary === fastCached) return prev;
              const domain = (() => {
                try {
                  return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
                } catch {
                  return '';
                }
              })();
              return {
                url,
                title: initialTitle || domain || url,
                domain,
                summary: fastCached,
                distilled: {
                  title: initialTitle || domain || url,
                  cleanText: '',
                  embeddedYouTubeVideoIds: [],
                  keyImages: [],
                  keyOutboundLinks: [],
                  wordCount: 0,
                },
                hasVideoTranscript: false,
                isCached: true,
                createdAt: new Date().toISOString(),
              };
            });
          }
          return;
        }
      }

      setLoading(true);
      setStatusMessage(forceRegenerate ? 'Reanalisando e gerando novo resumo...' : 'Analisando recurso web...');

      try {
        const result = await getOrGenerateLinkInfo(url, {
          forceRegenerate,
          scrapId,
          scrapDriveFileId,
          scrapLocalPath,
          masterKey,
          onProgress: (status) => {
            if (isMountedRef.current) {
              setStatusMessage(status);
            }
          },
        });

        if (isMountedRef.current) {
          setInfoResult(result);
          setLoading(false);
          if (result.summary) {
            onSaveSummary?.(result.summary);
          }
        }
      } catch (err: unknown) {
        if (isMountedRef.current) {
          console.error('[LinkInfoModal] Failed to process link information:', err);
          const msg = err instanceof Error ? err.message : String(err) || 'Falha ao analisar a página. Verifique se a chave de IA está ativa.';
          setError(msg);
          setLoading(false);
        }
      }
    },
    [url, initialSummary, initialTitle, scrapId, scrapDriveFileId, scrapLocalPath, masterKey, onSaveSummary]
  );

  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen) {
      fetchInfo(false);
    }
    return () => {
      isMountedRef.current = false;
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, [isOpen, fetchInfo]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopySummary = async () => {
    if (!infoResult?.summary) return;
    playUiActionSound();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(infoResult.summary);
      }
      setCopied(true);
      triggerToast('Resumo copiado para a área de transferência!', 'info', 2000);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      triggerToast('Não foi possível copiar o texto.', 'error');
    }
  };

  const handleInsertNotes = () => {
    if (!infoResult?.summary || !onInsertIntoNotes) return;
    playUiActionSound();
    onInsertIntoNotes(infoResult.summary);
    setInserted(true);
    triggerToast('Resumo inserido nas anotações do link!', 'info', 2500);
  };

  if (!isOpen) return null;

  const displayTitle = infoResult?.title || initialTitle || url;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="bg-zinc-900 border border-white/[0.08] rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 px-6 border-b border-white/[0.06] bg-zinc-900/60 shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
              <div className="w-9 h-9 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center shrink-0">
                <Sparkles size={17} className="text-brand-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white truncate leading-snug">
                    {displayTitle}
                  </h3>
                  {infoResult?.isCached && (
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-white/10 text-zinc-400 shrink-0">
                      Salvo em Cache
                    </span>
                  )}
                  {infoResult?.hasVideoTranscript && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/15 border border-red-500/25 text-red-300 shrink-0">
                      <Video size={10} />
                      Com Legendas de Vídeo
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 font-mono truncate mt-0.5">
                  {url}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  playUiClickSound();
                  fetchInfo(true);
                }}
                disabled={loading}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 cursor-pointer"
                title="Regenerar Resumo com IA"
                aria-label="Regenerar Resumo"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Fechar (Esc)"
                aria-label="Fechar"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-zinc-200">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-brand-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{statusMessage}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Higienizando o código da página e sintetizando conhecimento didático
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <AlertCircle size={20} className="text-rose-400" />
                </div>
                <div className="max-w-md">
                  <p className="text-sm font-semibold text-white">Não foi possível gerar o resumo</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => fetchInfo(true)}
                  className="mt-2 px-4 py-1.5 rounded-lg text-xs font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : infoResult?.summary ? (
              <div className="prose prose-invert prose-sm max-w-none space-y-3 leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    code({ className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeContent = String(children).replace(/\n$/, '');

                      if (match && match[1] === 'mermaid') {
                        return <MermaidViewer chart={codeContent} />;
                      }

                      return (
                        <code
                          className={`${className || ''} bg-black/40 text-brand-300 px-1.5 py-0.5 rounded text-xs font-mono`}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    blockquote({ children }) {
                      return (
                        <blockquote className="border-l-2 border-brand-500/50 pl-3.5 my-2 italic text-zinc-300 bg-brand-500/5 py-1.5 rounded-r-lg">
                          {children}
                        </blockquote>
                      );
                    },
                    details({ children }) {
                      return (
                        <details className="my-2 p-3 rounded-xl bg-black/30 border border-white/[0.08] cursor-pointer">
                          {children}
                        </details>
                      );
                    },
                    summary({ children }) {
                      return (
                        <summary className="font-medium text-xs text-brand-300 hover:text-brand-200 select-none">
                          {children}
                        </summary>
                      );
                    },
                  }}
                >
                  {infoResult.summary}
                </ReactMarkdown>
              </div>
            ) : null}
          </div>

          {/* Footer Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 px-6 border-t border-white/[0.06] bg-zinc-900/60 shrink-0">
            <span className="text-[11px] text-zinc-500">
              Pressione <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 font-mono text-[10px]">Esc</kbd> para fechar
            </span>

            <div className="flex items-center gap-2">
              {onInsertIntoNotes && infoResult?.summary && (
                <button
                  type="button"
                  onClick={handleInsertNotes}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    inserted
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                  }`}
                  title="Inserir resumo gerado na gaveta de anotações deste card"
                >
                  {inserted ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span>Inserido nas Notas</span>
                    </>
                  ) : (
                    <>
                      <StickyNote size={13} />
                      <span>Inserir nas Notas</span>
                    </>
                  )}
                </button>
              )}

              {infoResult?.summary && (
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    copied
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                  }`}
                  title="Copiar texto do resumo em Markdown"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copiar Resumo</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors shadow-sm cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

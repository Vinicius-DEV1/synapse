import { useEffect, useMemo, useState } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import type { PageHistoryEntry } from '../../types';
// @ts-ignore
import HtmlDiff from 'htmldiff-js';
import DOMPurify from 'dompurify';
import { Portal } from '../ui/Portal';

import { formatDateTimeWithSeconds } from '../../utils/date-utils';

interface PageHistoryModalProps {
  pageId: string;
  onClose: () => void;
}

type DiffExecutor = (oldHtml: string, newHtml: string) => string;

function resolveHtmlDiffExecutor(moduleRef: unknown): DiffExecutor | null {
  if (!moduleRef) return null;

  if (typeof moduleRef === 'object' || typeof moduleRef === 'function') {
    const candidate = moduleRef as Record<string, unknown>;

    // Case 1: direct .execute method on module (e.g. { execute: fn })
    if (typeof candidate.execute === 'function') {
      return candidate.execute as DiffExecutor;
    }

    // Case 2: default export object containing .execute (e.g. { default: { execute: fn } })
    if (
      candidate.default &&
      typeof candidate.default === 'object' &&
      typeof (candidate.default as Record<string, unknown>).execute === 'function'
    ) {
      return (candidate.default as Record<string, unknown>).execute as DiffExecutor;
    }

    // Case 3: default export function with attached .execute (e.g. function with v.execute)
    if (
      typeof candidate.default === 'function' &&
      'execute' in candidate.default &&
      typeof (candidate.default as unknown as { execute: unknown }).execute === 'function'
    ) {
      return (candidate.default as unknown as { execute: DiffExecutor }).execute;
    }
  }

  return null;
}

export default function PageHistoryModal({ pageId, onClose }: PageHistoryModalProps) {
  const [history, setHistory] = useState<PageHistoryEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    window.api.getPageHistory(pageId)
      .then((data) => {
        if (!mounted) return;
        setHistory(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error('Failed to load history', err);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [pageId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const currentEntry = history[selectedIndex];
  const previousEntry = history[selectedIndex + 1]; // Older entry since sorted DESC

  const diffHtml = useMemo(() => {
    if (!currentEntry) return '';
    const oldHtml = previousEntry ? previousEntry.content : '';
    const newHtml = currentEntry.content;

    try {
      const executeDiff = resolveHtmlDiffExecutor(HtmlDiff);
      const rawDiff = executeDiff ? executeDiff(oldHtml, newHtml) : newHtml;
      return DOMPurify.sanitize(rawDiff, {
        ADD_TAGS: ['ins', 'del'],
        FORBID_TAGS: ['script', 'iframe', 'object'],
      });
    } catch (diffErr) {
      console.error('[PageHistoryModal] Error computing HTML diff:', diffErr);
      return DOMPurify.sanitize(newHtml, {
        ADD_TAGS: ['ins', 'del'],
        FORBID_TAGS: ['script', 'iframe', 'object'],
      });
    }
  }, [currentEntry, previousEntry]);


  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-[#0f0f11] flex flex-col z-50 animate-fade-in select-text"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Header */}
        <div className="h-14 border-b border-white/5 flex items-center justify-between px-5 sm:px-8 bg-[#0f0f11]/90 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 border border-white/5">
              <Clock size={16} />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Histórico de Edições</h2>
              <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
                • {history.length} {history.length === 1 ? 'revisão' : 'revisões'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Fechar (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Split: Sidebar Timeline + Main Diff Canvas */}
        <div className="flex-1 flex overflow-hidden w-full h-full">
          {/* Sidebar - History List */}
          <div className="w-72 sm:w-80 border-r border-white/5 bg-[#121214] flex flex-col overflow-y-auto shrink-0">
            {loading ? (
              <div className="p-6 text-center text-zinc-500 text-xs font-mono">Carregando...</div>
            ) : history.length === 0 ? (
              <div className="p-6 flex flex-col items-center justify-center text-zinc-500 h-full opacity-60 text-center">
                <AlertCircle size={28} className="mb-2 text-zinc-500" />
                <p className="text-xs">Nenhum histórico encontrado.</p>
              </div>
            ) : (
              <div className="p-3 flex flex-col gap-1.5">
                {history.map((entry, index) => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedIndex(index)}
                    className={`text-left p-3.5 rounded-xl transition-all border ${
                      selectedIndex === index
                        ? 'bg-white/10 border-white/15 text-white shadow-sm'
                        : 'bg-transparent border-transparent hover:bg-white/5 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1">
                      {index === 0 ? 'Versão Atual' : `Revisão ${history.length - index}`}
                    </div>
                    <div className={`text-[11px] font-mono ${selectedIndex === index ? 'text-zinc-300' : 'text-zinc-500'}`}>
                      {formatDateTimeWithSeconds(entry.created_at)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Main Area - Diff Viewer */}
          <div className="flex-1 bg-[#0f0f11] overflow-y-auto relative diff-viewer-container">
            {currentEntry ? (
              <div className="max-w-3xl mx-auto px-6 py-10 sm:px-12 sm:py-16">
                <div className="mb-8 pb-4 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      {selectedIndex === 0 ? 'Versão Atual' : `Revisão ${history.length - selectedIndex}`}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono mt-1">
                      Visualizando {selectedIndex === 0 ? 'versão atual' : `revisão salva em ${formatDateTimeWithSeconds(currentEntry.created_at)}`}
                    </p>
                  </div>
                </div>

                <div 
                  className="prose prose-invert max-w-none text-zinc-200 leading-[1.8]"
                  dangerouslySetInnerHTML={{ __html: diffHtml }}
                />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-500 text-xs font-mono">
                {loading ? 'Buscando histórico...' : 'Selecione uma revisão à esquerda'}
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

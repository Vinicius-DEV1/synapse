import React, { useEffect } from 'react';
import { Layers, X, ArrowRight, ExternalLink, ChevronRight } from 'lucide-react';
import { Portal } from '../../../ui/Portal';
import type { DuplicatePageInfo } from '../hooks/useLinkDuplicates';

interface LinkDuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title?: string | null;
  duplicatePages: DuplicatePageInfo[];
  onNavigateToPage: (pageId: string) => void;
}

export default function LinkDuplicatesModal({
  isOpen,
  onClose,
  url,
  title,
  duplicatePages,
  onNavigateToPage,
}: LinkDuplicatesModalProps) {
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

  if (!isOpen) return null;

  const count = duplicatePages.length;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="duplicate-links-title"
          className="bg-zinc-900/95 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl backdrop-blur-xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-white/[0.06] bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Layers size={18} className="text-amber-400" />
              </div>
              <div>
                <h3 id="duplicate-links-title" className="text-base font-semibold text-white">
                  Link já utilizado no Caderno
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {count === 1
                    ? 'Este recurso já foi adicionado em 1 outra página:'
                    : `Este recurso já foi adicionado em ${count} outras páginas:`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Fechar (Esc)"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Target link reference pill */}
          <div className="px-5 pt-4 pb-2">
            <div className="px-3.5 py-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center gap-2.5">
              <ExternalLink size={14} className="text-zinc-500 shrink-0" />
              <div className="min-w-0 flex-1">
                {title ? (
                  <p className="text-xs font-medium text-zinc-200 truncate">{title}</p>
                ) : null}
                <p className="text-[11px] text-zinc-400 font-mono truncate">{url}</p>
              </div>
            </div>
          </div>

          {/* List of Duplicate Pages */}
          <div className="p-5 pt-2 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
            {duplicatePages.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => {
                  onNavigateToPage(page.id);
                  onClose();
                }}
                className="w-full group flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/15 transition-all text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-base shrink-0 select-none">
                    {page.icon || '📄'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-200 group-hover:text-white truncate transition-colors">
                      {page.title || 'Sem título'}
                    </p>
                    {page.ancestors && page.ancestors.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 group-hover:text-zinc-400 truncate mt-0.5 transition-colors">
                        {page.ancestors.map((ancestor, i) => (
                          <React.Fragment key={ancestor.id}>
                            <span>{ancestor.title}</span>
                            {i < page.ancestors.length - 1 && (
                              <ChevronRight size={10} className="shrink-0 opacity-60" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pl-3 text-xs font-medium text-brand-400 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                  <span className="hidden sm:inline">Ir para página</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 px-5 border-t border-white/[0.06] bg-zinc-900/60">
            <span className="text-[11px] text-zinc-500">
              Pressione <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 font-mono text-[10px]">Esc</kbd> para fechar
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors shadow-sm"
            >
              OK, Entendido
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

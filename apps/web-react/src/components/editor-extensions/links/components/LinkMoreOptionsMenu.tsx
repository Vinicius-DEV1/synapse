import React, { useRef, useEffect, useLayoutEffect } from 'react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import {
  FileArchive,
  Eye,
  RefreshCw,
  Palette,
  Check,
  Copy,
  LayoutGrid,
  Ungroup,
  Link2,
  Trash2,
  Loader2,
  Layers,
  Sparkles,
  Play,
  Hourglass,
  Info,
} from 'lucide-react';
import { Portal } from '../../../ui/Portal';

interface LinkMoreOptionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  // YouTube actions props
  isYouTube?: boolean;
  onWatch?: () => void;
  onOpenSummary?: () => void;
  // Duplicate pages props
  duplicateCount?: number;
  onOpenDuplicates?: () => void;
  // Scrap props
  onOpenInfo?: () => void;
  scrapId?: string | null;
  scrapStatus?: 'idle' | 'capturing' | 'ready' | 'sync_pending' | 'error' | null;
  onCaptureScrap?: () => void;
  onOpenScrap?: () => void;
  // Other action props
  watching?: boolean;
  onToggleWatching?: (e: React.MouseEvent) => void;
  watched?: boolean;
  onToggleWatched?: (e: React.MouseEvent) => void;
  onOpenPalette?: () => void;
  onCopyLink?: (e: React.MouseEvent) => void;
  isReloading?: boolean;
  onReload?: (e: React.MouseEvent) => void;
  isInsideGroup?: boolean;
  onUngroup?: (e: React.MouseEvent) => void;
  onGroupWithNext?: (e: React.MouseEvent) => void;
  onConvertToText?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

export default function LinkMoreOptionsMenu({
  isOpen,
  onClose,
  anchorRef,
  isYouTube,
  onWatch,
  onOpenSummary,
  duplicateCount,
  onOpenDuplicates,
  onOpenInfo,
  scrapId,
  scrapStatus,
  onCaptureScrap,
  onOpenScrap,
  watching,
  onToggleWatching,
  watched,
  onToggleWatched,
  onOpenPalette,
  onCopyLink,
  isReloading,
  onReload,
  isInsideGroup,
  onUngroup,
  onGroupWithNext,
  onConvertToText,
  onDelete,
}: LinkMoreOptionsMenuProps) {
  const { refs, floatingStyles, isPositioned } = useFloating({
    elements: {
      reference: anchorRef?.current,
    },
    placement: 'bottom-end',
    middleware: [offset(6), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  useLayoutEffect(() => {
    if (anchorRef?.current) {
      refs.setReference(anchorRef.current);
    }
  }, [anchorRef, refs]);

  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        (!anchorRef.current || !anchorRef.current.contains(target))
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const hasScrap = Boolean(scrapId && (scrapStatus === 'ready' || scrapStatus === 'sync_pending'));
  const isScrapCapturing = scrapStatus === 'capturing';

  return (
    <Portal>
      <div
        ref={(node) => {
          refs.setFloating(node);
          menuRef.current = node;
        }}
        style={{
          ...floatingStyles,
          visibility: isPositioned ? 'visible' : 'hidden',
          opacity: isPositioned ? 1 : 0,
          pointerEvents: isPositioned ? 'auto' : 'none',
        }}
        className={`z-[999] w-56 rounded-xl bg-zinc-900/95 border border-white/[0.08] shadow-2xl backdrop-blur-xl p-1.5 text-xs text-zinc-300 ${
          isPositioned ? 'animate-in fade-in zoom-in-95 duration-100' : ''
        } select-none space-y-1`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seção YouTube: Assistir Aqui + Resumo do Vídeo */}
        {isYouTube && (onWatch || onOpenSummary) && (
          <>
            <div className="space-y-0.5">
              {onWatch && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    onWatch();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-red-500/15 text-red-300 hover:text-red-200 transition-colors text-left font-medium cursor-pointer"
                >
                  <Play size={14} className="shrink-0 text-red-400 fill-red-400" />
                  <span>Assistir Aqui</span>
                </button>
              )}
              {onOpenSummary && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    onOpenSummary();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-brand-500/15 text-brand-300 hover:text-brand-200 transition-colors text-left font-medium cursor-pointer"
                >
                  <Sparkles size={14} className="shrink-0 text-brand-400" />
                  <span>Resumo do Vídeo</span>
                </button>
              )}
            </div>
            <div className="h-[1px] bg-white/[0.06] my-1" />
          </>
        )}

        {/* Nova Ação: Informações & Resumo IA (acima de Snapshot) */}
        {onOpenInfo && (
          <>
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onOpenInfo();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-brand-500/15 text-zinc-200 hover:text-brand-300 transition-colors text-left font-medium cursor-pointer group/info"
                title="Abrir informações detalhadas e resumo do link gerado por IA"
              >
                <Info size={14} className="shrink-0 text-brand-400 group-hover/info:scale-110 transition-transform" />
                <span>Informações & Resumo IA</span>
              </button>
            </div>
            <div className="h-[1px] bg-white/[0.06] my-1" />
          </>
        )}

        {/* Seção 1: Scrap / Snapshot Offline */}
        <div className="space-y-0.5">
          {hasScrap ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onOpenScrap?.();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/15 text-emerald-300 hover:text-emerald-200 transition-colors text-left font-medium"
              >
                <Eye size={14} className="shrink-0" />
                <span>Ver Snapshot Offline</span>
              </button>

              <button
                type="button"
                disabled={isScrapCapturing}
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onCaptureScrap?.();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors text-left"
              >
                <RefreshCw size={13} className={`shrink-0 ${isScrapCapturing ? 'animate-spin' : ''}`} />
                <span>Recapturar Snapshot</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isScrapCapturing}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onCaptureScrap?.();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-brand-500/15 text-zinc-200 hover:text-brand-300 transition-colors text-left font-medium disabled:opacity-50"
            >
              {isScrapCapturing ? (
                <>
                  <Loader2 size={14} className="shrink-0 animate-spin text-brand-400" />
                  <span>Capturando página...</span>
                </>
              ) : (
                <>
                  <FileArchive size={14} className="shrink-0 text-brand-400" />
                  <span>Salvar Snapshot Offline</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="h-[1px] bg-white/[0.06] my-1" />

        {/* Seção 2: Aparência & Progresso */}
        <div className="space-y-0.5">
          {onOpenPalette && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onOpenPalette();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors text-left"
            >
              <Palette size={14} className="shrink-0 text-zinc-400" />
              <span>Personalizar Cor</span>
            </button>
          )}

          {onToggleWatching && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onToggleWatching(e);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors text-left cursor-pointer"
            >
              <Hourglass
                size={14}
                className={`shrink-0 ${watching ? 'text-amber-400' : 'text-zinc-500'}`}
              />
              <span>{watching ? 'Marcar como não assistindo' : 'Assistindo'}</span>
            </button>
          )}

          {onToggleWatched && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onToggleWatched(e);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors text-left"
            >
              <Check
                size={14}
                className={`shrink-0 ${watched ? 'text-emerald-400 stroke-[2.5]' : 'text-zinc-500'}`}
              />
              <span>{watched ? 'Marcar como não concluído' : 'Marcar como concluído'}</span>
            </button>
          )}
        </div>

        <div className="h-[1px] bg-white/[0.06] my-1" />

        {/* Seção 3: Utilidades & Layout */}
        <div className="space-y-0.5">
          {duplicateCount !== undefined && duplicateCount > 0 && onOpenDuplicates && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onOpenDuplicates();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/15 text-amber-300 hover:text-amber-200 transition-colors text-left font-medium"
            >
              <Layers size={14} className="shrink-0 text-amber-400" />
              <span>Ver em outras páginas ({duplicateCount})</span>
            </button>
          )}

          {onCopyLink && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onCopyLink(e);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors text-left"
            >
              <Copy size={14} className="shrink-0 text-zinc-400" />
              <span>Copiar Link Original</span>
            </button>
          )}

          {onReload && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onReload(e);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors text-left"
            >
              <RefreshCw size={14} className={`shrink-0 text-zinc-400 ${isReloading ? 'animate-spin' : ''}`} />
              <span>Recarregar Metadados</span>
            </button>
          )}

          {isInsideGroup ? (
            onUngroup && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onUngroup(e);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors text-left"
              >
                <Ungroup size={14} className="shrink-0 text-zinc-400" />
                <span>Desagrupar Link</span>
              </button>
            )
          ) : (
            onGroupWithNext && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  onGroupWithNext(e);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors text-left"
              >
                <LayoutGrid size={14} className="shrink-0 text-zinc-400" />
                <span>Agrupar Lado a Lado</span>
              </button>
            )
          )}

          {onConvertToText && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onConvertToText(e);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 hover:text-white transition-colors text-left"
            >
              <Link2 size={14} className="shrink-0 text-zinc-400" />
              <span>Converter para Texto Simples</span>
            </button>
          )}
        </div>

        {onDelete && (
          <>
            <div className="h-[1px] bg-white/[0.06] my-1" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onDelete(e);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-300/90 hover:text-rose-200 transition-colors text-left"
            >
              <Trash2 size={14} className="shrink-0 text-rose-400" />
              <span>Remover Link</span>
            </button>
          </>
        )}
      </div>
    </Portal>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  MoreHorizontal,
  StickyNote,
} from 'lucide-react';
import ColorPalettePicker from '../../ColorPalettePicker';
import LinkMoreOptionsMenu from './LinkMoreOptionsMenu';
import { triggerToast } from '../../../ui/ToastContext';

interface LinkCardActionsProps {
  url: string;
  color?: string;
  isCustomColor: boolean;
  watched?: boolean;
  notes: string;
  showNotes: boolean;
  isInsideGroup: boolean;
  isReloading: boolean;
  showColorPicker: boolean;
  colorPickerRef: React.RefObject<HTMLDivElement>;
  setShowColorPicker: (show: boolean) => void;
  onChangeColor?: (color: string) => void;
  onToggleWatched?: (e: React.MouseEvent) => void;
  onConvertToText?: (e: React.MouseEvent) => void;
  onToggleNotes: (e: React.MouseEvent) => void;
  onUngroup: (e: React.MouseEvent) => void;
  onGroupWithNext: (e: React.MouseEvent) => void;
  onReload: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  // Duplicate links integration
  duplicateCount?: number;
  onOpenDuplicates?: () => void;
  // Scrap integration
  scrapId?: string | null;
  scrapStatus?: 'idle' | 'capturing' | 'ready' | 'sync_pending' | 'error' | null;
  onCaptureScrap?: () => void;
  onOpenScrap?: () => void;
}

export default function LinkCardActions({
  url,
  color,
  isCustomColor: _isCustomColor,
  watched,
  notes,
  showNotes,
  isInsideGroup,
  isReloading,
  showColorPicker,
  colorPickerRef: _colorPickerRef,
  setShowColorPicker,
  onChangeColor,
  onToggleWatched,
  onConvertToText,
  onToggleNotes,
  onUngroup,
  onGroupWithNext,
  onReload,
  onDelete,
  duplicateCount,
  onOpenDuplicates,
  scrapId,
  scrapStatus,
  onCaptureScrap,
  onOpenScrap,
}: LinkCardActionsProps) {
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleCopyLink = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!url) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      triggerToast('Link copiado para a área de transferência!', 'info', 2500);
    } catch (err) {
      console.error('Falha ao copiar link:', err);
      triggerToast('Não foi possível copiar o link.', 'error');
    }
  };

  return (
    <div
      className={`absolute top-2.5 right-2.5 flex items-center gap-1.5 transition-opacity ${
        showMoreMenu || showColorPicker ? 'opacity-100 z-50' : 'opacity-0 group-hover/link:opacity-100'
      }`}
    >
      {/* Botão 1: Anotações Integradas (com indicador visual se houver notas) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleNotes(e);
        }}
        className={`p-1.5 rounded-lg transition-all flex items-center justify-center border backdrop-blur-sm relative ${
          showNotes
            ? 'bg-brand-500/25 text-brand-200 border-brand-500/40 shadow-sm'
            : notes
            ? 'bg-brand-500/15 text-brand-300 border-brand-500/30'
            : 'bg-dark-card/85 hover:bg-white/10 text-zinc-400 hover:text-white border-white/5'
        }`}
        title={
          showNotes
            ? 'Recolher Anotações do Link'
            : notes
            ? 'Expandir Anotações do Link'
            : 'Adicionar Anotações ao Link (+)'
        }
      >
        <StickyNote size={14} />
        {/* Ponto indicador se houver anotação salva */}
        {notes && !showNotes && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-400 ring-1 ring-black" />
        )}
      </button>

      {/* Botão 2: Mais Opções (•••) */}
      <div className="relative">
        <button
          ref={moreButtonRef}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMoreMenu((prev) => !prev);
          }}
          className={`p-1.5 rounded-lg transition-all flex items-center justify-center border backdrop-blur-sm ${
            showMoreMenu
              ? 'bg-white/20 text-white border-white/20 shadow-sm'
              : 'bg-dark-card/85 hover:bg-white/10 text-zinc-400 hover:text-white border-white/5'
          }`}
          title="Mais opções do link (•••)"
          aria-label="Mais opções do link"
        >
          <MoreHorizontal size={14} />
        </button>

        <LinkMoreOptionsMenu
          isOpen={showMoreMenu}
          onClose={() => setShowMoreMenu(false)}
          anchorRef={moreButtonRef}
          duplicateCount={duplicateCount}
          onOpenDuplicates={onOpenDuplicates}
          scrapId={scrapId}
          scrapStatus={scrapStatus}
          onCaptureScrap={onCaptureScrap}
          onOpenScrap={onOpenScrap}
          watched={watched}
          onToggleWatched={onToggleWatched}
          onOpenPalette={() => setShowColorPicker(true)}
          onCopyLink={handleCopyLink}
          isReloading={isReloading}
          onReload={onReload}
          isInsideGroup={isInsideGroup}
          onUngroup={onUngroup}
          onGroupWithNext={onGroupWithNext}
          onConvertToText={onConvertToText}
          onDelete={onDelete}
        />

        {showColorPicker && onChangeColor && (
          <ColorPalettePicker
            anchorRef={moreButtonRef}
            currentColor={color || 'default'}
            onSelectColor={(c) => {
              onChangeColor(c);
              setShowColorPicker(false);
            }}
            onClearColor={() => {
              onChangeColor('default');
              setShowColorPicker(false);
            }}
            onClose={() => setShowColorPicker(false)}
          />
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import {
  Trash2,
  Copy,
  Check,
  StickyNote,
  Pencil,
  X,
  Palette,
  CornerDownRight,
  Loader2,
} from 'lucide-react';
import type { LibraryHighlight } from '../../../../types';
import { triggerToast } from '../../../ui/ToastContext';
import { isMobileScreen } from '../../../../services/platform';

interface PdfHighlightInspectorProps {
  highlight: LibraryHighlight;
  position: { x: number; y: number };
  onClose: () => void;
  onDelete: (id: string) => Promise<void> | void;
  onUpdateColor: (id: string, color: LibraryHighlight['color']) => Promise<void> | void;
  onUpdateNote: (id: string, note: string) => Promise<void> | void;
}

const COLORS: Array<{ id: LibraryHighlight['color']; hex: string; name: string }> = [
  { id: 'yellow', hex: '#fbbf24', name: 'Amarelo' },
  { id: 'green', hex: '#34d399', name: 'Verde' },
  { id: 'blue', hex: '#60a5fa', name: 'Azul' },
  { id: 'pink', hex: '#f472b6', name: 'Rosa' },
  { id: 'orange', hex: '#fb923c', name: 'Laranja' },
];

const checkIsMobile = (): boolean =>
  typeof window !== 'undefined' &&
  (isMobileScreen() || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

export const PdfHighlightInspector: React.FC<PdfHighlightInspectorProps> = ({
  highlight,
  position,
  onClose,
  onDelete,
  onUpdateColor,
  onUpdateNote,
}) => {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(highlight.note || '');
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isMobile, setIsMobile] = useState(() => checkIsMobile());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(checkIsMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setNoteDraft(highlight.note || '');
  }, [highlight.note]);

  useEffect(() => {
    if (isEditingNote) {
      textareaRef.current?.focus();
    }
  }, [isEditingNote]);

  // Click / touch outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 150);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [onClose]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyText = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!highlight.text_content) return;
    try {
      await navigator.clipboard.writeText(highlight.text_content);
      setCopied(true);
      triggerToast('Texto copiado para a área de transferência', 'success');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      triggerToast('Falha ao copiar texto', 'error');
    }
  };

  const handleSaveNote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSavingNote) return;
    try {
      setIsSavingNote(true);
      await onUpdateNote(highlight.id, noteDraft.trim());
      setIsEditingNote(false);
      triggerToast('Nota salva com sucesso', 'success');
    } catch {
      triggerToast('Falha ao salvar nota', 'error');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      await onDelete(highlight.id);
      triggerToast('Marcação removida', 'success');
      onClose();
    } catch {
      triggerToast('Falha ao remover marcação', 'error');
      setIsDeleting(false);
    }
  };

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Opções da marcação"
      className={`highlight-popup highlight-inspector z-[130] select-none ${
        isMobile
          ? 'fixed bottom-4 inset-x-3 max-w-sm mx-auto animate-in slide-in-from-bottom-4 duration-200'
          : 'absolute animate-in fade-in zoom-in-95 duration-150'
      }`}
      style={
        isMobile
          ? {
              bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
              width: 'calc(100% - 24px)',
              maxWidth: 360,
            }
          : {
              top: position.y + 10,
              left: Math.max(
                16,
                Math.min(
                  typeof window !== 'undefined' ? window.innerWidth - 306 : 300,
                  position.x - 140
                )
              ),
              width: 290,
            }
      }
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-dark-card/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-3.5 flex flex-col gap-3 text-xs">
        {/* Header with Title and Close */}
        <div className="flex items-center justify-between pb-1 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm"
              style={{
                backgroundColor:
                  COLORS.find((c) => c.id === highlight.color)?.hex || '#fbbf24',
              }}
            />
            <span className="font-semibold text-white/90">Marcação</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyText}
              className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Copiar texto destacado"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Fechar (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Color Palette Switcher */}
        <div className="flex items-center justify-between gap-1 bg-white/[0.03] p-1.5 rounded-xl border border-white/5">
          <span className="text-[10px] text-white/50 font-medium ml-1 flex items-center gap-1">
            <Palette size={11} /> Cor:
          </span>
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onUpdateColor(highlight.id, c.id)}
                className={`w-5 h-5 rounded-full transition-all duration-150 flex items-center justify-center ${
                  highlight.color === c.id
                    ? 'ring-2 ring-white/80 scale-110 shadow-sm'
                    : 'opacity-70 hover:opacity-100 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={`Alterar para cor ${c.name}`}
              >
                {highlight.color === c.id && <Check size={10} className="text-black/80 font-bold" />}
              </button>
            ))}
          </div>
        </div>

        {/* Note Editor / Viewer */}
        <div className="flex flex-col gap-1.5">
          {isEditingNote ? (
            <div className="flex flex-col gap-2">
              <textarea
                ref={textareaRef}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Escreva uma nota para esta marcação..."
                maxLength={500}
                rows={3}
                className="w-full px-2.5 py-2 bg-dark-bg border border-white/15 rounded-xl text-xs text-white placeholder:text-white/30 focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/30 outline-none resize-none"
              />
              <div className="flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  disabled={isSavingNote}
                  className="px-2.5 py-1 rounded-lg text-[11px] text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveNote()}
                  disabled={isSavingNote}
                  className="px-3 py-1 rounded-lg text-[11px] font-medium bg-brand-600 hover:bg-brand-500 text-white transition-colors flex items-center gap-1 shadow-sm"
                >
                  {isSavingNote && <Loader2 size={11} className="animate-spin" />}
                  Salvar
                </button>
              </div>
            </div>
          ) : highlight.note?.trim() ? (
            <div className="flex flex-col gap-1.5 bg-white/[0.04] p-2 rounded-xl border border-white/5">
              <div className="flex items-center justify-between text-[11px] text-amber-300 font-medium">
                <span className="flex items-center gap-1">
                  <StickyNote size={12} /> Nota
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingNote(true)}
                  className="text-white/50 hover:text-white p-0.5 rounded transition-colors flex items-center gap-1 text-[10px]"
                >
                  <Pencil size={11} /> Editar
                </button>
              </div>
              <p className="text-white/90 text-xs leading-relaxed break-words whitespace-pre-wrap max-h-28 overflow-y-auto pr-1">
                {highlight.note}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingNote(true)}
              className="w-full py-1.5 px-2.5 rounded-xl border border-dashed border-white/15 text-white/60 hover:text-white hover:border-brand-400/40 hover:bg-white/[0.02] transition-colors flex items-center justify-center gap-1.5 text-xs"
            >
              <StickyNote size={13} className="text-amber-300/80" />
              <span>Adicionar nota</span>
            </button>
          )}
        </div>

        {/* Text snippet preview */}
        {highlight.text_content && (
          <div className="text-[11px] text-dark-subtext italic line-clamp-2 px-1 flex items-start gap-1">
            <CornerDownRight size={10} className="shrink-0 mt-0.5 opacity-50" />
            <span>"{highlight.text_content}"</span>
          </div>
        )}

        {/* Action bar: Delete Button */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-end">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors border border-red-500/20 active:scale-98"
          >
            {isDeleting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Trash2 size={13} />
            )}
            <span>Remover marcação</span>
          </button>
        </div>
      </div>
    </div>
  );
};

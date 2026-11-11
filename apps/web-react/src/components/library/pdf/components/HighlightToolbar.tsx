import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StickyNote, BookType, Trash2, Copy, Check, X } from 'lucide-react';
import type { HighlightColor } from '../../../../types';
import { triggerToast } from '../../../ui/ToastContext';
import { isMobileScreen } from '../../../../services/platform';

interface HighlightToolbarProps {
  position: { x: number; y: number };
  selectedText?: string;
  existingHighlight?: { id: string; color: HighlightColor; note?: string };
  onHighlight?: (color: HighlightColor, note?: string) => void;
  onUpdateHighlight?: (id: string, color: HighlightColor, note?: string) => void;
  onDeleteHighlight?: (id: string) => void;
  onDictionary?: (text: string, preloadedData?: unknown) => void;
  onDismiss: () => void;
}

const HIGHLIGHT_COLORS: { color: HighlightColor; hex: string; label: string }[] = [
  { color: 'yellow', hex: '#fbbf24', label: 'Amarelo' },
  { color: 'green', hex: '#34d399', label: 'Verde' },
  { color: 'blue', hex: '#60a5fa', label: 'Azul' },
  { color: 'pink', hex: '#f472b6', label: 'Rosa' },
  { color: 'orange', hex: '#fb923c', label: 'Laranja' },
];

const checkIsMobile = (): boolean =>
  typeof window !== 'undefined' &&
  (isMobileScreen() || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

export default function HighlightToolbar({
  position,
  selectedText,
  existingHighlight,
  onHighlight,
  onUpdateHighlight,
  onDeleteHighlight,
  onDictionary,
  onDismiss,
}: HighlightToolbarProps) {
  const [showNoteInput, setShowNoteInput] = useState(!!existingHighlight?.note);
  const [selectedColor, setSelectedColor] = useState<HighlightColor | null>(existingHighlight?.color || null);
  const [noteText, setNoteText] = useState(existingHighlight?.note || '');
  const [copied, setCopied] = useState(false);
  const [isMobile, setIsMobile] = useState(() => checkIsMobile());
  const toolbarRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  // Keep mobile state in sync on resize
  useEffect(() => {
    const handleResize = () => setIsMobile(checkIsMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const clampedPosition = (() => {
    const toolbarWidth = 260;
    const toolbarHeight = 56;
    const margin = 8;
    let x = position.x;
    let y = position.y;
    let translateY = '-100%';

    if (x - toolbarWidth / 2 < margin) x = toolbarWidth / 2 + margin;
    if (x + toolbarWidth / 2 > window.innerWidth - margin) x = window.innerWidth - toolbarWidth / 2 - margin;
    if (y - toolbarHeight < margin) {
      y = position.y + 40; // flip below selection
      translateY = '0';
    }

    return { x, y, translateY };
  })();

  // Click / touch outside to dismiss with guaranteed timer cleanup
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = (e.target instanceof Element
        ? e.target
        : (e.target as Node | null)?.parentElement) as HTMLElement | null;

      if (!target || toolbarRef.current?.contains(target)) return;

      // Do not dismiss if interacting directly inside the PDF text layer or page wrapper,
      // as native selection handles and selection changes are managed by usePdfHighlights
      if (target.closest('.pdf-text-layer, .pdf-page-wrapper, .pdf-highlight-rect')) {
        return;
      }

      onDismiss();
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
  }, [onDismiss]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  // Focus note input when opened
  useEffect(() => {
    if (showNoteInput && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [showNoteInput]);

  const handleColorClick = useCallback(
    (color: HighlightColor) => {
      if (existingHighlight && onUpdateHighlight) {
        onUpdateHighlight(existingHighlight.id, color, noteText.trim() || undefined);
        if (!showNoteInput) onDismiss();
        else setSelectedColor(color);
      } else if (showNoteInput) {
        setSelectedColor(color);
      } else if (onHighlight) {
        onHighlight(color);
      }
    },
    [existingHighlight, onUpdateHighlight, noteText, showNoteInput, onHighlight, onDismiss]
  );

  const handleNoteToggle = useCallback(() => {
    setShowNoteInput((prev) => !prev);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!selectedText) return;
    try {
      await navigator.clipboard.writeText(selectedText);
      setCopied(true);
      triggerToast('Texto copiado para a área de transferência', 'success');
      setTimeout(() => {
        setCopied(false);
        onDismiss();
      }, 500);
    } catch {
      triggerToast('Falha ao copiar texto', 'error');
    }
  }, [selectedText, onDismiss]);

  const handleNoteSubmit = useCallback(() => {
    if (existingHighlight && onUpdateHighlight) {
      onUpdateHighlight(
        existingHighlight.id,
        selectedColor || existingHighlight.color,
        noteText.trim() || undefined
      );
      onDismiss();
    } else if (onHighlight && selectedColor) {
      onHighlight(selectedColor, noteText.trim() || undefined);
    }
  }, [existingHighlight, onUpdateHighlight, selectedColor, noteText, onHighlight, onDismiss]);

  const handleNoteKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleNoteSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
      }
    },
    [handleNoteSubmit, onDismiss]
  );

  const renderNoteSection = () => (
    <div className="px-3 pb-2.5 animate-fade-in">
      {noteText.startsWith('<!-- AI_DICT -->') ? (
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-2.5 flex flex-col gap-2 mt-2 w-full max-w-[280px]">
          <div className="flex items-center gap-1.5 text-brand-500">
            <BookType size={14} />
            <span className="text-xs font-bold uppercase tracking-wider">Tradução Salva</span>
          </div>
          <div className="text-xs opacity-90 italic text-dark-text whitespace-normal">
            {(() => {
              try {
                const data = JSON.parse(noteText.replace('<!-- AI_DICT -->', '')) as {
                  portuguese?: { translation?: string };
                };
                return data.portuguese?.translation
                  ? `"${data.portuguese.translation}"`
                  : 'Tradução disponível no dicionário completo.';
              } catch {
                return 'Tradução detalhada salva pela IA.';
              }
            })()}
          </div>
          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={() => {
                let preloadedData: unknown;
                try {
                  preloadedData = JSON.parse(noteText.replace('<!-- AI_DICT -->', ''));
                } catch {
                  preloadedData = null;
                }
                if (onDictionary) {
                  onDictionary(selectedText || existingHighlight?.note || '', preloadedData);
                }
                onDismiss();
              }}
              className="px-3 py-1.5 bg-brand-500 text-white rounded-lg text-[11px] font-bold hover:bg-brand-600 transition-colors flex items-center gap-1.5"
            >
              <BookType size={12} /> Ver Dicionário
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 mt-2">
            <input
              ref={noteInputRef}
              type="text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={handleNoteKeyDown}
              placeholder="Adicionar nota..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-dark-text placeholder:text-dark-subtext/50 focus:outline-none focus:border-brand-500/50 transition-colors"
            />
            {selectedColor && (
              <button
                type="button"
                onClick={handleNoteSubmit}
                className="px-2 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs rounded-lg transition-colors font-medium"
              >
                OK
              </button>
            )}
          </div>
          {!selectedColor && (
            <p className="text-[10px] text-dark-subtext/60 mt-1 px-0.5">
              Selecione uma cor acima
            </p>
          )}
        </>
      )}
    </div>
  );

  // MOBILE: Floating Bottom Island (Zero collision with Android Chrome's ActionMode menu)
  if (isMobile) {
    return (
      <div
        ref={toolbarRef}
        role="toolbar"
        aria-label="Ações de marcação"
        className="fixed z-[130] bottom-4 inset-x-3 max-w-sm mx-auto select-none animate-in slide-in-from-bottom-4 fade-in duration-200 highlight-toolbar-container"
        style={{
          bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
        }}
        onMouseDown={(e) => e.preventDefault()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="bg-dark-card/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden p-2.5">
          {/* Selected text preview with quick dismiss */}
          {selectedText && (
            <div className="text-[11px] text-white/70 italic truncate px-1.5 pb-2 border-b border-white/10 mb-2 flex items-center justify-between">
              <span className="truncate">"{selectedText}"</span>
              <button
                type="button"
                onClick={onDismiss}
                className="text-white/40 hover:text-white p-0.5 ml-2 shrink-0 rounded transition-colors"
                title="Fechar seleção (Esc)"
                aria-label="Fechar seleção"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Color & Action Row */}
          <div className="flex items-center justify-between gap-1">
            {/* 5 Colors with touch-friendly hit areas */}
            <div className="flex items-center gap-2">
              {HIGHLIGHT_COLORS.map(({ color, hex, label }) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorClick(color)}
                  className={`w-7 h-7 rounded-full transition-transform active:scale-90 flex items-center justify-center ${
                    selectedColor === color
                      ? 'ring-2 ring-white/80 scale-110 shadow-md'
                      : 'hover:scale-110 active:scale-95'
                  }`}
                  style={{ backgroundColor: hex }}
                  title={label}
                  aria-label={`Marcar com cor ${label}`}
                >
                  {selectedColor === color && <Check size={12} className="text-black/80 font-bold" />}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-white/15 mx-1 shrink-0" />

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* Copy button */}
              {selectedText && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-2 rounded-xl text-white/75 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                  title="Copiar texto"
                  aria-label="Copiar texto"
                >
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                </button>
              )}

              {/* Dictionary button */}
              {(!existingHighlight || selectedText) && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedText) onDictionary?.(selectedText);
                    onDismiss();
                  }}
                  className="p-2 rounded-xl text-white/75 hover:text-brand-400 hover:bg-white/10 active:scale-90 transition-all"
                  title="Dicionário / Traduzir"
                  aria-label="Dicionário / Traduzir"
                >
                  <BookType size={16} />
                </button>
              )}

              {/* Note button */}
              <button
                type="button"
                onClick={handleNoteToggle}
                className={`p-2 rounded-xl active:scale-90 transition-all ${
                  showNoteInput
                    ? 'bg-brand-500/20 text-brand-400'
                    : 'text-white/75 hover:text-brand-400 hover:bg-white/10'
                }`}
                title={existingHighlight?.note ? 'Editar nota' : 'Adicionar nota'}
                aria-label="Adicionar nota"
              >
                <StickyNote size={16} />
              </button>

              {/* Delete button if existing */}
              {existingHighlight && onDeleteHighlight && (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteHighlight(existingHighlight.id);
                    onDismiss();
                  }}
                  className="p-2 rounded-xl text-white/75 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                  title="Excluir marcação"
                  aria-label="Excluir marcação"
                >
                  <Trash2 size={16} />
                </button>
              )}

              {/* Close button if no selectedText preview header */}
              {!selectedText && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 active:scale-90 transition-all"
                  title="Fechar"
                  aria-label="Fechar"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Note input section */}
          {showNoteInput && renderNoteSection()}
        </div>
      </div>
    );
  }

  // DESKTOP: Cursor-adjacent clamped popover
  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Barra de marcação"
      className="fixed z-50 animate-scale-in highlight-toolbar-container select-none"
      style={{
        left: `${clampedPosition.x}px`,
        top: `${clampedPosition.y}px`,
        transform: `translate(-50%, ${clampedPosition.translateY})`,
        animation: 'toolbar-pop 0.15s ease-out',
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="bg-dark-card/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Color row */}
        <div className="flex items-center gap-1.5 px-3 py-2.5">
          {HIGHLIGHT_COLORS.map(({ color, hex, label }) => (
            <button
              key={color}
              type="button"
              onClick={() => handleColorClick(color)}
              className={`w-5 h-5 rounded-full transition-all duration-150 hover:scale-125 active:scale-90 flex items-center justify-center ${
                selectedColor === color
                  ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-dark-card scale-110'
                  : 'hover:ring-2 hover:ring-white/30 hover:ring-offset-1 hover:ring-offset-dark-card'
              }`}
              style={{ backgroundColor: hex }}
              title={label}
              aria-label={`Cor ${label}`}
            >
              {selectedColor === color && <Check size={10} className="text-black/80 font-bold" />}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Copy */}
          {selectedText && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-dark-subtext hover:bg-white/10 hover:text-white transition-all active:scale-90"
              title="Copiar texto"
              aria-label="Copiar texto"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          )}

          {/* Dictionary */}
          {(!existingHighlight || selectedText) && (
            <button
              type="button"
              onClick={() => {
                if (selectedText) onDictionary?.(selectedText);
                onDismiss();
              }}
              className="p-1.5 rounded-lg text-dark-subtext hover:bg-white/10 hover:text-brand-400 transition-all active:scale-90"
              title="Dicionário / Traduzir"
              aria-label="Dicionário / Traduzir"
            >
              <BookType size={14} />
            </button>
          )}

          {/* Note toggle */}
          <button
            type="button"
            onClick={handleNoteToggle}
            className={`p-1.5 rounded-lg transition-all active:scale-90 ${
              showNoteInput
                ? 'bg-brand-500/20 text-brand-400'
                : 'text-dark-subtext hover:bg-white/10 hover:text-brand-400'
            }`}
            title={existingHighlight?.note ? 'Editar nota' : 'Adicionar nota'}
            aria-label="Adicionar nota"
          >
            <StickyNote size={14} />
          </button>

          {existingHighlight && onDeleteHighlight && (
            <button
              type="button"
              onClick={() => {
                onDeleteHighlight(existingHighlight.id);
                onDismiss();
              }}
              className="p-1.5 rounded-lg text-dark-subtext hover:bg-red-500/20 hover:text-red-400 transition-all active:scale-90"
              title="Excluir marcação"
              aria-label="Excluir marcação"
            >
              <Trash2 size={14} />
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-dark-subtext hover:bg-white/10 hover:text-white transition-all active:scale-90"
            title="Fechar (Esc)"
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>

        {/* Note input / AI Dict Card */}
        {showNoteInput && renderNoteSection()}
      </div>
    </div>
  );
}


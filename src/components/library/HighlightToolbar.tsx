import { useState, useRef, useEffect, useCallback } from 'react';
import { StickyNote, BookType } from 'lucide-react';
import type { HighlightColor } from '../../types';

interface HighlightToolbarProps {
  position: { x: number; y: number };
  selectedText: string;
  onHighlight: (color: HighlightColor, note?: string) => void;
  onDictionary: (text: string) => void;
  onDismiss: () => void;
}

const HIGHLIGHT_COLORS: { color: HighlightColor; hex: string; label: string }[] = [
  { color: 'yellow', hex: '#fbbf24', label: 'Amarelo' },
  { color: 'green', hex: '#34d399', label: 'Verde' },
  { color: 'blue', hex: '#60a5fa', label: 'Azul' },
  { color: 'pink', hex: '#f472b6', label: 'Rosa' },
  { color: 'orange', hex: '#fb923c', label: 'Laranja' },
];

export default function HighlightToolbar({ position, selectedText, onHighlight, onDictionary, onDismiss }: HighlightToolbarProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [selectedColor, setSelectedColor] = useState<HighlightColor | null>(null);
  const [noteText, setNoteText] = useState('');
  const toolbarRef = useRef<HTMLDivElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  const clampedPosition = (() => {
    const toolbarWidth = 220;
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

  // Click outside to dismiss
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    // Delay attaching so the mouseup that opened us doesn't immediately close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onDismiss]);

  // Focus note input when opened
  useEffect(() => {
    if (showNoteInput && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [showNoteInput]);

  const handleColorClick = useCallback((color: HighlightColor) => {
    if (showNoteInput) {
      setSelectedColor(color);
    } else {
      onHighlight(color);
    }
  }, [showNoteInput, onHighlight]);

  const handleNoteToggle = useCallback(() => {
    setShowNoteInput(prev => !prev);
  }, []);

  const handleNoteSubmit = useCallback(() => {
    if (selectedColor) {
      onHighlight(selectedColor, noteText.trim() || undefined);
    }
  }, [selectedColor, noteText, onHighlight]);

  const handleNoteKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedColor) {
      e.preventDefault();
      handleNoteSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onDismiss();
    }
  }, [selectedColor, handleNoteSubmit, onDismiss]);

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 animate-scale-in highlight-toolbar-container"
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
              onClick={() => handleColorClick(color)}
              className={`w-5 h-5 rounded-full transition-all duration-150 hover:scale-125 active:scale-90 ${
                selectedColor === color
                  ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-dark-card scale-110'
                  : 'hover:ring-2 hover:ring-white/30 hover:ring-offset-1 hover:ring-offset-dark-card'
              }`}
              style={{ backgroundColor: hex }}
              title={label}
            />
          ))}

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1" />

          {/* Dictionary */}
          <button
            onClick={() => {
              onDictionary(selectedText);
              onDismiss();
            }}
            className="p-1.5 rounded-lg text-dark-subtext hover:bg-white/10 hover:text-brand-400 transition-all active:scale-90"
            title="Dicionário / Traduzir"
          >
            <BookType size={14} />
          </button>

          {/* Note toggle */}
          <button
            onClick={handleNoteToggle}
            className={`p-1.5 rounded-lg transition-all active:scale-90 ${
              showNoteInput
                ? 'bg-brand-500/20 text-brand-400'
                : 'text-dark-subtext hover:bg-white/10 hover:text-brand-400'
            }`}
            title="Adicionar nota"
          >
            <StickyNote size={14} />
          </button>
        </div>

        {/* Note input */}
        {showNoteInput && (
          <div className="px-3 pb-2.5 animate-fade-in">
            <div className="flex items-center gap-1.5">
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
          </div>
        )}
      </div>
    </div>
  );
}

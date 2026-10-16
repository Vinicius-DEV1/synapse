import React from 'react';
import { StickyNote, CornerDownRight } from 'lucide-react';
import type { LibraryHighlight } from '../../../../types';

interface PdfHighlightNoteTooltipProps {
  highlight: LibraryHighlight;
  position: { x: number; y: number };
}

const COLOR_MAP: Record<string, string> = {
  yellow: '#fbbf24',
  green: '#34d399',
  blue: '#60a5fa',
  pink: '#f472b6',
  orange: '#fb923c',
};

export const PdfHighlightNoteTooltip: React.FC<PdfHighlightNoteTooltipProps> = ({
  highlight,
  position,
}) => {
  const noteText = highlight.note?.trim();
  if (!noteText) return null;

  const colorHex = COLOR_MAP[highlight.color] || '#fbbf24';

  return (
    <div
      className="highlight-note-tooltip absolute z-[110] pointer-events-none select-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        top: position.y + 12,
        left: Math.max(16, position.x - 130),
        maxWidth: 280,
      }}
    >
      <div className="bg-dark-card/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl p-3 text-xs flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: colorHex }}
          />
          <div className="flex items-center gap-1.5 font-semibold text-white/90">
            <StickyNote size={13} className="text-amber-300" />
            <span>Nota da marcação</span>
          </div>
        </div>

        {/* Note Content */}
        <div className="text-white/95 leading-relaxed bg-white/[0.04] p-2 rounded-lg border border-white/5 break-words whitespace-pre-wrap font-sans max-h-32 overflow-y-auto">
          {noteText}
        </div>

        {/* Highlighted text snippet */}
        {highlight.text_content && (
          <div className="flex items-start gap-1 text-[11px] text-dark-subtext italic line-clamp-2 pl-0.5">
            <CornerDownRight size={11} className="shrink-0 mt-0.5 opacity-60" />
            <span>"{highlight.text_content}"</span>
          </div>
        )}

        {/* Footer Hint */}
        <div className="text-[10px] text-white/40 pt-1 border-t border-white/5 text-right">
          Clique na marcação para opções
        </div>
      </div>
    </div>
  );
};

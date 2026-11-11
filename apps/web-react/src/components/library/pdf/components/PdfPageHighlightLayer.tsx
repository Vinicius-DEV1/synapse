import React from 'react';
import type { LibraryHighlight } from '../../../../types';
import type { ReadingMode } from '../types';
import { mergeHighlightRects, type HighlightRect } from '../utils/highlightRects';

interface PdfPageHighlightLayerProps {
  highlights: LibraryHighlight[];
  readingMode: ReadingMode;
  onHighlightClick: (highlight: LibraryHighlight, rect: DOMRect) => void;
  onHighlightHover?: (highlight: LibraryHighlight | null, rect: DOMRect | null) => void;
}

const COLOR_MAP: Record<string, string> = {
  yellow: '#fbbf24',
  green: '#34d399',
  blue: '#60a5fa',
  pink: '#f472b6',
  orange: '#fb923c',
};

const DARK_MODES = new Set<ReadingMode>([
  'dark',
  'dim',
  'nord',
  'high-contrast',
  'midnight',
]);

export const PdfPageHighlightLayer: React.FC<PdfPageHighlightLayerProps> = React.memo(
  ({ highlights, readingMode, onHighlightClick, onHighlightHover }) => {
    const isDarkMode = DARK_MODES.has(readingMode);

    return (
      <div
        className="pdf-highlight-layer"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        {highlights.map((h, i) => {
          try {
            const rawRects = JSON.parse(h.rects) as HighlightRect[];
            // Unify adjacent word rects into continuous lines to eliminate "pills" & seams
            const rects = mergeHighlightRects(rawRects);
            const colorHex = COLOR_MAP[h.color] || '#fbbf24';
            const hasNote = Boolean(h.note?.trim());

            return rects.map((r, j) => {
              const isLastRect = j === rects.length - 1;

              return (
                <div
                  key={`${i}-${j}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetEl = e.currentTarget as HTMLElement;
                    const rect = targetEl.getBoundingClientRect();
                    onHighlightClick(h, rect);
                  }}
                  onMouseEnter={(e) => {
                    if (onHighlightHover) {
                      const targetEl = e.currentTarget as HTMLElement;
                      const rect = targetEl.getBoundingClientRect();
                      onHighlightHover(h, rect);
                    }
                  }}
                  onMouseLeave={() => {
                    if (onHighlightHover) {
                      onHighlightHover(null, null);
                    }
                  }}
                  data-highlight-id={h.id}
                  className="pdf-highlight-rect group/hl cursor-pointer transition-opacity hover:opacity-85"
                  style={{
                    position: 'absolute',
                    left: `${r.left * 100}%`,
                    top: `${r.top * 100}%`,
                    width: `${r.width * 100}%`,
                    height: `${r.height * 100}%`,
                    backgroundColor: colorHex,
                    opacity: isDarkMode ? 0.35 : 0.45,
                    mixBlendMode: isDarkMode ? 'screen' : 'multiply',
                    borderRadius: '2px',
                    pointerEvents: 'auto',
                  }}
                >
                  {/* Subtle note indicator icon at the end of the highlight if a note exists */}
                  {hasNote && isLastRect && (
                    <span
                      title="Contém nota"
                      className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-amber-400 text-black flex items-center justify-center text-[8px] font-bold shadow-sm pointer-events-none ring-1 ring-white/20"
                    >
                      •
                    </span>
                  )}
                </div>
              );
            });
          } catch {
            return null;
          }
        })}
      </div>
    );
  }
);

PdfPageHighlightLayer.displayName = 'PdfPageHighlightLayer';

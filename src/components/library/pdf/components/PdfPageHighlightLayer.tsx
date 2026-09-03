import React from 'react';
import type { LibraryHighlight } from '../../../../types';
import type { ReadingMode } from '../types';

interface HighlightRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface PdfPageHighlightLayerProps {
  highlights: LibraryHighlight[];
  readingMode: ReadingMode;
  onHighlightClick: (highlight: LibraryHighlight, rect: DOMRect) => void;
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
  ({ highlights, readingMode, onHighlightClick }) => {
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
            const rects = JSON.parse(h.rects) as HighlightRect[];
            const colorHex = COLOR_MAP[h.color] || '#fbbf24';

            return rects.map((r, j) => (
              <div
                key={`${i}-${j}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const targetEl = e.target as HTMLElement;
                  const rect = targetEl.getBoundingClientRect();
                  onHighlightClick(h, rect);
                }}
                className="cursor-pointer transition-opacity hover:opacity-75"
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
              />
            ));
          } catch {
            return null;
          }
        })}
      </div>
    );
  }
);

PdfPageHighlightLayer.displayName = 'PdfPageHighlightLayer';

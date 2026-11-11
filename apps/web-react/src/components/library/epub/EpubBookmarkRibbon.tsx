import { Bookmark } from 'lucide-react';
import { useEpubBookmark } from './hooks/useEpubBookmark';
import { useEpub } from './EpubContext';

export default function EpubBookmarkRibbon() {
  const { isBookmarked, toggleBookmark, scrollMode } = useEpubBookmark();
  const { readingMode, textWidth } = useEpub();

  // Dynamic positioning right on the border of the reading column
  const rightOffsetClass =
    textWidth === 'narrow' ? 'right-4 sm:right-6 md:right-8' :
    textWidth === 'medium' ? 'right-4 sm:right-8 md:right-12' :
    'right-4 sm:right-10 md:right-16';

  const isDark = ['dark', 'dim', 'nord', 'midnight', 'high-contrast'].includes(readingMode);

  // In continuous scroll mode, bookmarks are rendered inline next to paragraphs
  if (scrollMode) {
    return null;
  }

  return (
    <div
      className={`absolute top-0 ${rightOffsetClass} z-20 pointer-events-auto select-none transition-all duration-300`}
      style={{
        transform: 'translateZ(0)', // Force GPU compositor layer
      }}
    >
      {/* 
        Interactive Bookmark Ribbon (Lacinho clássico de caderno)
        Inspired by Adobe Acrobat, Apple Books and classic notebook satin ribbons
      */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleBookmark();
        }}
        title={
          isBookmarked
            ? 'Página marcada • Clique para desmarcar'
            : 'Clique para marcar esta página'
        }
        className={`group relative flex flex-col items-center cursor-pointer transition-all duration-200 outline-none focus:outline-none ${
          isBookmarked
            ? 'translate-y-0 opacity-100 hover:translate-y-1'
            : '-translate-y-6 opacity-0 hover:opacity-80 hover:-translate-y-1 focus:opacity-80 focus:-translate-y-1'
        }`}
        aria-label={isBookmarked ? 'Desmarcar página' : 'Marcar página'}
      >
        {/* Top notebook binding fold */}
        <div className="w-6 h-[3px] bg-rose-950/60 rounded-t-sm" />

        {/* Ribbon satin body */}
        <div
          className="relative w-6 h-10 shadow-md transition-colors"
          style={{
            background: isDark
              ? 'linear-gradient(180deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)'
              : 'linear-gradient(180deg, #fb7185 0%, #e11d48 50%, #9f1239 100%)',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.35))',
          }}
        >
          {/* Subtle vertical satin specular highlight */}
          <div className="absolute inset-y-0 left-[2px] w-[2px] bg-white/25 pointer-events-none" />

          {/* Minimalist bookmark icon indicator inside the ribbon */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white/90 group-hover:scale-110 transition-transform">
            <Bookmark size={11} className="fill-current text-white/95" />
          </div>
        </div>

        {/* Hover helper badge (minimalist tooltip) */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75 whitespace-nowrap bg-black/85 backdrop-blur-md text-white text-[11px] font-medium px-2 py-1 rounded-md shadow-lg border border-white/10">
          {isBookmarked ? 'Página Marcada' : 'Marcar Página'}
        </div>
      </button>

      {/* 
        In continuous scroll mode: subtle end-of-line ribbon indicator
        accompanies the reading line if marked.
      */}
      {scrollMode && isBookmarked && (
        <div
          className="absolute -top-1 -right-2 flex items-center gap-1 pointer-events-none animate-fade-in"
          title="Marcador de leitura ativo"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
        </div>
      )}
    </div>
  );
}

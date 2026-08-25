import type { ChangeEvent } from 'react';

interface EpubBottomBarProps {
  readingMode: string;
  showMobileTools: boolean;
  locationsReady: boolean;
  currentPageSafe: number;
  totalPagesSafe: number;
  progressPercentage: number;
  onScrub: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function EpubBottomBar({
  readingMode,
  showMobileTools,
  locationsReady,
  currentPageSafe,
  totalPagesSafe,
  progressPercentage,
  onScrub,
}: EpubBottomBarProps) {
  const bottomBarClasses =
    readingMode === 'dark'
      ? 'bg-[#1a1a1a] text-gray-500'
      : readingMode === 'midnight'
      ? 'bg-[#0f172a] text-[#475569]'
      : readingMode === 'nord'
      ? 'bg-[#2e3440] text-[#4c566a]'
      : readingMode === 'dim'
      ? 'bg-[#2d2d30] text-[#808080]'
      : readingMode === 'high-contrast'
      ? 'bg-[#000000] text-[#aaaaaa]'
      : readingMode === 'sepia'
      ? 'bg-[#e9dec0] text-[#8c765f]'
      : readingMode === 'mint'
      ? 'bg-[#c8e6c9] text-[#2d6a4f]'
      : 'bg-white text-gray-400';

  return (
    <div
      className={`
        group relative flex-shrink-0 h-8 flex items-center justify-between px-6 text-[11px] font-medium tracking-wider uppercase transition-all duration-300 z-[60]
        fixed md:relative bottom-0 left-0 right-0
        ${showMobileTools ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
        ${bottomBarClasses}
      `}
    >
      <div>
        {locationsReady ? `Página ${currentPageSafe} de ${totalPagesSafe}` : 'Calculando páginas...'}
      </div>

      {locationsReady && totalPagesSafe > 1 && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-[80%] max-w-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-300 pb-2">
          <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 shadow-2xl border border-white/10 flex flex-col items-center gap-2">
            <span className="text-white font-bold text-xs">Página {currentPageSafe}</span>
            <input
              type="range"
              min="1"
              max={totalPagesSafe}
              value={currentPageSafe}
              onChange={onScrub}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
          </div>
        </div>
      )}

      <div>{locationsReady ? `${progressPercentage}%` : '...'}</div>
    </div>
  );
}

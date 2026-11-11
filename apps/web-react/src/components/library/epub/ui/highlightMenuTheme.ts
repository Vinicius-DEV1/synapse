import type { ReadingMode } from '../../../../types';

export interface HighlightMenuThemeStyles {
  isDark: boolean;
  modeClass: string;
  dividerClass: string;
  noteAreaClass: string;
  textareaClass: string;
}

export function getHighlightMenuTheme(readingMode: ReadingMode): HighlightMenuThemeStyles {
  const isDark = ['dark', 'midnight', 'nord', 'dim', 'high-contrast'].includes(readingMode);

  const modeClass = (() => {
    switch (readingMode) {
      case 'midnight':
        return 'bg-[#0f172a] border-[#334155] text-[#f1f5f9] shadow-2xl shadow-black/70';
      case 'nord':
        return 'bg-[#2e3440] border-[#4c566a] text-[#eceff4] shadow-2xl shadow-black/50';
      case 'dim':
        return 'bg-[#2d2d30] border-[#454545] text-[#e0e0e0] shadow-2xl shadow-black/50';
      case 'dark':
        return 'bg-[#1a1a1a] border-gray-700 text-white shadow-2xl shadow-black/70';
      case 'high-contrast':
        return 'bg-black border-white/40 text-white shadow-2xl shadow-white/10';
      case 'sepia':
        return 'bg-[#f4ecd8] border-[#d4c6a0] text-[#5b4636] shadow-xl';
      case 'mint':
        return 'bg-[#e8f5e9] border-[#c8e6c9] text-[#2d6a4f] shadow-xl';
      case 'light':
      default:
        return 'bg-white border-gray-200 text-gray-900 shadow-xl';
    }
  })();

  const dividerClass = isDark
    ? 'bg-white/15'
    : readingMode === 'sepia'
    ? 'bg-[#d4c6a0]'
    : readingMode === 'mint'
    ? 'bg-[#c8e6c9]'
    : 'bg-gray-200';

  const noteAreaClass = isDark
    ? 'border-white/10'
    : readingMode === 'sepia'
    ? 'border-[#d4c6a0]'
    : readingMode === 'mint'
    ? 'border-[#c8e6c9]'
    : 'border-gray-100';

  const textareaClass = (() => {
    switch (readingMode) {
      case 'midnight':
        return 'bg-[#1e293b] border-[#334155] text-white placeholder-slate-400';
      case 'nord':
        return 'bg-[#3b4252] border-[#4c566a] text-white placeholder-slate-300';
      case 'dim':
        return 'bg-[#383838] border-[#4c4c4c] text-white placeholder-gray-400';
      case 'dark':
        return 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400';
      case 'high-contrast':
        return 'bg-black border-white text-white placeholder-gray-400';
      case 'sepia':
        return 'bg-[#e9dec0] border-[#d4c6a0] text-[#5b4636] placeholder-[#8c765f]';
      case 'mint':
        return 'bg-[#d8edd9] border-[#b7dfb9] text-[#2d6a4f] placeholder-[#52796f]';
      case 'light':
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400';
    }
  })();

  return {
    isDark,
    modeClass,
    dividerClass,
    noteAreaClass,
    textareaClass,
  };
}

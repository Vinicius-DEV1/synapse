import React from 'react';
import { ArrowLeft, Menu, Bookmark, Search, FileText, Type, Sparkles } from 'lucide-react';
import { useEpub } from './EpubContext';
import { useStore } from '../../../store/useStore';

interface EpubTopBarProps {
  onBack: () => void;
}

export default function EpubTopBar({ onBack }: EpubTopBarProps) {
  const { state, dispatch } = useStore();
  const {
    book, readingMode, showToc, setShowToc, showNotebook, setShowNotebook,
    showSearch, setShowSearch, showSettings, setShowSettings,
    bookmarks, setBookmarks, rendition, currentPage
  } = useEpub();

  const currentCfi = rendition?.location?.start?.cfi;
  const isBookmarked = bookmarks.some(b => b.label === currentCfi);

  const handleToggleBookmark = async () => {
    if (!currentCfi) return;
    if (isBookmarked) {
      const bm = bookmarks.find(b => b.label === currentCfi);
      if (bm) {
        await window.api.library.deleteBookmark(bm.id);
        setBookmarks(prev => prev.filter(b => b.id !== bm.id));
      }
    } else {
      const bm = await window.api.library.createBookmark({
        book_id: book.id,
        page_number: currentPage,
        label: currentCfi
      });
      setBookmarks(prev => [...prev, bm]);
    }
  };

  const isDark = ['dark', 'dim', 'nord', 'midnight', 'high-contrast'].includes(readingMode);

  return (
    <div className={`flex-shrink-0 h-14 flex items-center justify-between px-4 z-20 shadow-sm border-b transition-colors
        ${isDark ? 'bg-[#1a1a1a] border-gray-800 text-gray-200' : 
          readingMode === 'sepia' ? 'bg-[#e9dec0] border-[#d4c6a0] text-[#5b4636]' : 
          readingMode === 'mint' ? 'bg-[#e8f5e9] border-[#c8e6c9] text-[#1b4332]' : 
          'bg-white border-gray-200 text-gray-800'}`}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <button
          onClick={onBack}
          className={`p-2 rounded-lg transition-colors flex-shrink-0 ml-10 md:ml-0
            ${isDark ? 'hover:bg-gray-800' : 'hover:bg-black/5'}`}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold truncate" title={book.title}>{book.title}</h1>
          <div className="text-xs opacity-70 truncate">{book.author || 'Desconhecido'}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <button onClick={() => setShowToc(!showToc)} className={`p-2 rounded-lg transition-colors ${showToc ? 'bg-brand-500/20 text-brand-500' : (isDark ? 'hover:bg-gray-800' : 'hover:bg-black/5')}`} title="Índice (Sumário)">
          <Menu size={18} />
        </button>
        <button onClick={() => setShowNotebook(!showNotebook)} className={`p-2 rounded-lg transition-colors ${showNotebook ? 'bg-brand-500/20 text-brand-500' : (isDark ? 'hover:bg-gray-800' : 'hover:bg-black/5')}`} title="Caderno (Meus Recortes)">
          <FileText size={18} />
        </button>
        <button onClick={handleToggleBookmark} className={`p-2 rounded-lg transition-colors ${isBookmarked ? 'bg-brand-500/20 text-brand-500' : (isDark ? 'hover:bg-gray-800' : 'hover:bg-black/5')}`} title="Marcador">
          <Bookmark size={18} className={isBookmarked ? 'fill-current' : ''} />
        </button>
        <button onClick={() => setShowSearch(!showSearch)} className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-brand-500/20 text-brand-500' : (isDark ? 'hover:bg-gray-800' : 'hover:bg-black/5')}`} title="Buscar">
          <Search size={18} />
        </button>
        <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-brand-500/20 text-brand-500' : (isDark ? 'hover:bg-gray-800' : 'hover:bg-black/5')}`} title="Tipografia">
          <Type size={18} />
        </button>
        <button onClick={() => dispatch({ type: 'TOGGLE_AI_SIDEBAR' })} className={`p-2 rounded-lg transition-colors ${state.showAiSidebar ? 'bg-brand-500/20 text-brand-500' : (isDark ? 'hover:bg-gray-800' : 'hover:bg-black/5')}`} title="IA">
          <Sparkles size={18} />
        </button>
      </div>
    </div>
  );
}

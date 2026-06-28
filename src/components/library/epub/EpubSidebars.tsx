import React, { useState } from 'react';
import { Search, BookOpen, Bookmark, Trash2, X } from 'lucide-react';
import { useEpub } from './EpubContext';

export default function EpubSidebars() {
  const {
    readingMode, rendition,
    showToc, setShowToc, toc,
    showSearch, setShowSearch, epubBook,
    showNotebook, setShowNotebook, highlights, bookmarks, setHighlights, setBookmarks
  } = useEpub();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notebookTab, setNotebookTab] = useState<'highlights' | 'bookmarks'>('highlights');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !epubBook) return;
    setSearchLoading(true);
    setSearchResults([]);
    const results: any[] = [];
    
    try {
      await Promise.all(
        epubBook.spine.spineItems.map(async (item: any) => {
          try {
            await item.load(epubBook.load.bind(epubBook));
            const matches = item.find(searchQuery);
            if (matches && matches.length > 0) {
              results.push(...matches);
            }
          } catch (e) {
          } finally {
            item.unload();
          }
        })
      );
      setSearchResults(results);
    } catch (err) {
      console.error("Search failed", err);
    }
    setSearchLoading(false);
  };

  const handleDeleteHighlight = async (id: string, cfi: string) => {
    await window.api.library.deleteHighlight(id);
    setHighlights(prev => prev.filter(h => h.id !== id));
    rendition?.annotations.remove(cfi, "highlight");
  };

  const handleDeleteBookmark = async (id: string) => {
    await window.api.library.deleteBookmark(id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const isDark = ['dark', 'dim', 'nord', 'midnight', 'high-contrast'].includes(readingMode);

  const sidebarClass = `absolute left-0 top-14 bottom-8 w-80 z-30 overflow-y-auto border-r shadow-xl transition-transform
    ${isDark ? 'bg-[#1a1a1a] border-gray-800 text-gray-200' : 
      readingMode === 'sepia' ? 'bg-[#f4ecd8] border-[#d4c6a0] text-[#5b4636]' : 
      readingMode === 'mint' ? 'bg-[#e8f5e9] border-[#c8e6c9] text-[#1b4332]' : 
      'bg-white border-gray-200 text-gray-800'}`;

  return (
    <>
      {showToc && (
        <div className={sidebarClass}>
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg opacity-80">Sumário</h3>
              <button onClick={() => setShowToc(false)} className="md:hidden p-1 opacity-50 hover:opacity-100">
                <X size={20} />
              </button>
            </div>
            {toc.length === 0 ? (
              <p className="opacity-50 text-sm">Nenhum sumário encontrado.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {toc.map((item, index) => (
                  <li key={index}>
                    <button 
                      onClick={() => {
                        rendition?.display(item.href);
                        setShowToc(false);
                      }}
                      className="text-left w-full hover:text-brand-500 opacity-80 hover:opacity-100 transition-opacity"
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {showSearch && (
        <div className={sidebarClass}>
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg opacity-80">Buscar no Livro</h3>
              <button onClick={() => setShowSearch(false)} className="md:hidden p-1 opacity-50 hover:opacity-100">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite para buscar..."
                className={`flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-brand-500 transition-colors
                  ${isDark ? 'bg-[#2a2a2a] border-gray-700 text-white' : 
                    readingMode === 'sepia' ? 'bg-[#e9dec0] border-[#d4c6a0] text-[#5b4636]' : 
                    readingMode === 'mint' ? 'bg-[#c8e6c9] border-[#a5d6a7] text-[#1b4332]' : 
                    'bg-gray-50 border-gray-200 text-gray-900'}`}
              />
              <button 
                type="submit"
                disabled={searchLoading || !searchQuery.trim()}
                className="p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
              >
                <Search size={18} />
              </button>
            </form>

            {searchLoading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-brand-500"></div>
              </div>
            ) : searchResults.length > 0 ? (
              <ul className="space-y-3">
                {searchResults.map((res, index) => (
                  <li key={index} className="text-sm">
                    <button 
                      onClick={() => {
                        rendition?.display(res.cfi);
                        setShowSearch(false);
                      }}
                      className="text-left w-full hover:bg-black/5 p-2 rounded-lg transition-colors"
                    >
                      <div className="opacity-80 line-clamp-3 leading-snug">
                         ...{res.excerpt}...
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : searchQuery && !searchLoading ? (
              <p className="opacity-50 text-sm text-center">Nenhum resultado encontrado.</p>
            ) : null}
          </div>
        </div>
      )}

      {showNotebook && (
        <div className={sidebarClass}>
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg opacity-80 flex items-center gap-2">
                <BookOpen size={20} />
                Meu Caderno
              </h3>
              <button onClick={() => setShowNotebook(false)} className="md:hidden p-1 opacity-50 hover:opacity-100">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex gap-2 mb-4 border-b pb-2">
              <button 
                onClick={() => setNotebookTab('highlights')}
                className={`flex-1 text-sm font-semibold pb-1 border-b-2 transition-colors ${notebookTab === 'highlights' ? 'border-brand-500 text-brand-500' : 'border-transparent opacity-60'}`}
              >
                Grifos
              </button>
              <button 
                onClick={() => setNotebookTab('bookmarks')}
                className={`flex-1 text-sm font-semibold pb-1 border-b-2 transition-colors ${notebookTab === 'bookmarks' ? 'border-brand-500 text-brand-500' : 'border-transparent opacity-60'}`}
              >
                Marcadores
              </button>
            </div>

            {notebookTab === 'highlights' && (
              highlights.length === 0 ? (
                <p className="opacity-50 text-sm text-center">Nenhum texto grifado ainda.</p>
              ) : (
                <ul className="space-y-4">
                  {highlights.map(hl => (
                    <li key={hl.id} className="text-sm p-3 rounded-lg border bg-black/5 dark:bg-white/5 relative group">
                      <div className="flex justify-between items-start mb-2">
                        <div className={`w-3 h-3 rounded-full shadow-sm flex-shrink-0 mt-1`} style={{ backgroundColor: { yellow: '#fbbf24', green: '#34d399', blue: '#60a5fa', pink: '#f472b6' }[hl.color as string] || '#fbbf24' }} />
                        <button 
                          onClick={() => handleDeleteHighlight(hl.id, hl.rects)}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-1 rounded transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={() => {
                          rendition?.display(hl.rects);
                          setShowNotebook(false);
                        }}
                        className="text-left w-full hover:text-brand-500 transition-colors"
                      >
                        <div className="opacity-90 italic leading-snug">
                           "{hl.text_content}"
                        </div>
                        {hl.note && (
                          <div className="mt-2 text-xs font-medium text-brand-600 dark:text-brand-400 p-2 bg-white/50 dark:bg-black/20 rounded">
                            📝 {hl.note}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}

            {notebookTab === 'bookmarks' && (
              bookmarks.length === 0 ? (
                <p className="opacity-50 text-sm text-center">Nenhum marcador criado ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {bookmarks.map(bm => (
                    <li key={bm.id} className="text-sm border-b border-black/5 dark:border-white/5 pb-2 last:border-0 relative group flex items-center justify-between">
                      <button 
                        onClick={() => {
                          rendition?.display(bm.label);
                          setShowNotebook(false);
                        }}
                        className="text-left flex-1 hover:text-brand-500 transition-colors flex items-center gap-2"
                      >
                        <Bookmark size={14} className="text-brand-500" />
                        Página Marcada
                      </button>
                      <button 
                        onClick={() => handleDeleteBookmark(bm.id)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-500/10 p-1 rounded transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Search, BookOpen, Bookmark, Trash2, X, Sparkles } from 'lucide-react';
import { useEpub, type TocItem } from './EpubContext';

export default function EpubSidebars() {
  const {
    readingMode, rendition,
    showToc, setShowToc, toc,
    showSearch, setShowSearch, epubBook,
    showNotebook, setShowNotebook, highlights, bookmarks, setHighlights, setBookmarks,
    locationsReady, currentSectionHref, totalPages
  } = useEpub();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [notebookTab, setNotebookTab] = useState<'highlights' | 'bookmarks'>('highlights');

  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  const normalizeHref = (href: string): string => {
    if (!href) return '';
    return href.split('#')[0].replace(/^(\.\/|\/)/, '').trim().toLowerCase();
  };

  const activeNormalized = currentSectionHref ? normalizeHref(currentSectionHref) : '';

  // Pre-calculate page numbers for TOC items once locations are ready
  const tocPages = useMemo(() => {
    if (!locationsReady || !epubBook) return new Map<string, number>();
    const map = new Map<string, number>();
    try {
      // 1. Index all locations by section cfiBase for instant O(1) page lookup
      const cfiBaseToPage = new Map<string, number>();
      const locations = (epubBook.locations as unknown as { _locations?: string[] })?._locations;
      if (Array.isArray(locations)) {
        for (let i = 0; i < locations.length; i++) {
          const locCfi = locations[i];
          if (typeof locCfi === 'string') {
            const excl = locCfi.indexOf('!');
            if (excl !== -1) {
              const rawBase = locCfi.slice(8, excl); // strip "epubcfi(" up to "!"
              const norm = rawBase.replace(/!$/, '');
              const withExcl = `${norm}!`;
              const noId = norm.replace(/\[.*?\]/g, '');
              const noIdWithExcl = `${noId}!`;

              if (!cfiBaseToPage.has(norm)) cfiBaseToPage.set(norm, i + 1);
              if (!cfiBaseToPage.has(withExcl)) cfiBaseToPage.set(withExcl, i + 1);
              if (!cfiBaseToPage.has(noId)) cfiBaseToPage.set(noId, i + 1);
              if (!cfiBaseToPage.has(noIdWithExcl)) cfiBaseToPage.set(noIdWithExcl, i + 1);
            }
          }
        }
      }

      const spine = epubBook.spine as unknown as {
        get?: (href: string) => { cfiBase?: string };
        spineItems?: Array<{ href?: string; cfiBase?: string }>;
      };

      const resolvePage = (item: TocItem) => {
        let page: number | undefined;
        const cleanHref = (item.href || '').split('#')[0].replace(/^(\.\/|\/)/, '');
        const section = spine?.get?.(cleanHref) || spine?.get?.(item.href) ||
          spine?.spineItems?.find(s => s.href && (s.href === cleanHref || cleanHref.endsWith(s.href) || s.href.endsWith(cleanHref)));

        if (section?.cfiBase) {
          const norm = section.cfiBase.replace(/!$/, '');
          const noId = norm.replace(/\[.*?\]/g, '');
          const mapped = cfiBaseToPage.get(norm) ?? cfiBaseToPage.get(noId) ?? cfiBaseToPage.get(`${norm}!`);
          if (mapped !== undefined) {
            page = mapped;
          } else {
            try {
              const fullCfi = `epubcfi(${norm}!/4/2/1:0)`;
              const loc = epubBook.locations.locationFromCfi(fullCfi);
              if (typeof loc === 'number' && loc >= 0) {
                page = loc + 1;
              }
            } catch {
              // fallback
            }
          }
        }

        if (page !== undefined) {
          map.set(item.href, page);
        }

        if (Array.isArray(item.subitems)) {
          item.subitems.forEach(resolvePage);
        }
      };

      toc.forEach(resolvePage);
    } catch (err) {
      console.debug('[EpubSidebars] Failed to calculate TOC pages:', err);
    }
    return map;
  }, [toc, locationsReady, epubBook]);

  // Auto-scroll active TOC chapter into view
  useEffect(() => {
    if (showToc && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [showToc, currentSectionHref]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !epubBook) return;
    setSearchLoading(true);
    setSearchResults([]);
    const results: any[] = [];
    
    try {
      const spineObj = epubBook.spine as unknown as { spineItems?: Array<{ load: (fn: any) => Promise<void>; find: (q: string) => any[]; unload: () => void }> };
      const items = spineObj?.spineItems || [];
      await Promise.all(
        items.map(async (item) => {
          try {
            await item.load(epubBook.load.bind(epubBook));
            const matches = item.find(searchQuery);
            if (matches && matches.length > 0) {
              results.push(...matches);
            }
          } catch (e) {
            console.debug('Failed to search spine item:', e);
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

  const renderTocNode = (item: TocItem, key: string, depth = 0) => {
    const itemNormalized = normalizeHref(item.href);
    const isActive = Boolean(
      activeNormalized && (
        itemNormalized === activeNormalized ||
        activeNormalized.endsWith(itemNormalized) ||
        itemNormalized.endsWith(activeNormalized)
      )
    );
    const page = tocPages.get(item.href);

    return (
      <li key={key} className={depth > 0 ? 'ml-3' : ''}>
        <button
          ref={isActive ? activeItemRef : undefined}
          onClick={() => {
            rendition?.display(item.href);
            setShowToc(false);
          }}
          className={`text-left w-full rounded-lg px-2.5 py-1.5 transition-all flex items-center justify-between group ${
            isActive
              ? 'bg-brand-500/15 text-brand-400 font-semibold border-l-2 border-brand-500'
              : 'hover:bg-white/5 opacity-80 hover:opacity-100 hover:text-brand-400'
          }`}
        >
          <span className="truncate pr-2">{item.label}</span>
          {page !== undefined && (
            <span
              className={`text-[11px] font-mono shrink-0 ${
                isActive ? 'text-brand-400 font-medium' : 'opacity-40 group-hover:opacity-75'
              }`}
            >
              pág. {page}
            </span>
          )}
        </button>
        {Array.isArray(item.subitems) && item.subitems.length > 0 && (
          <ul className="space-y-1 mt-1 border-l border-white/10 pl-1">
            {item.subitems.map((sub, sIdx) => renderTocNode(sub, `${key}-${sIdx}`, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

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
              <ul className="space-y-1.5 text-sm">
                {toc.map((item, index) => renderTocNode(item, `${index}`))}
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
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full shadow-sm flex-shrink-0 mt-0.5`} style={{ backgroundColor: { yellow: '#fbbf24', green: '#34d399', blue: '#60a5fa', pink: '#f472b6' }[hl.color as string] || '#fbbf24' }} />
                          <span className="text-[11px] font-medium opacity-60">
                            {totalPages && hl.page_number ? `Pág. ${hl.page_number} (${Math.round((hl.page_number / totalPages) * 100)}%)` : ''}
                          </span>
                        </div>
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
                          <div className="mt-2 text-xs font-medium text-brand-600 dark:text-brand-400 p-2 bg-white/50 dark:bg-black/20 rounded text-left">
                            {hl.note.startsWith('<!-- AI_DICT -->') ? (
                              (() => {
                                try {
                                  const data = JSON.parse(hl.note.replace('<!-- AI_DICT -->', ''));
                                  let defs: string[] = [];
                                  if (data.english?.definitions) defs = data.english.definitions;
                                  else if (data.english?.definition) defs = [data.english.definition];
                                  else if (data.definitions) defs = data.definitions;
                                  else if (data.definition) defs = [data.definition];
                                  
                                  const textToShow = defs.length > 0 ? defs[0] : (data.portuguese?.definition || data.portuguese?.definitions?.[0] || 'Dicionário IA');
                                  
                                  return (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center gap-1 opacity-70">
                                        <Sparkles size={10} /> <span className="font-bold text-[9px] uppercase tracking-wider">IA Salva</span>
                                      </div>
                                      <div className="line-clamp-2 opacity-90">{textToShow}</div>
                                    </div>
                                  );
                                } catch {
                                  return <>📝 {hl.note}</>;
                                }
                              })()
                            ) : (
                              <>📝 {hl.note}</>
                            )}
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
                        <Bookmark size={14} className="text-brand-500 flex-shrink-0" />
                        <span className="truncate">
                          {totalPages && bm.page_number ? `Página ${bm.page_number} (${Math.round((bm.page_number / totalPages) * 100)}%)` : 'Página Marcada'}
                        </span>
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

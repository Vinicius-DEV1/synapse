import { useState } from 'react';
import { PanelLeftClose, PanelLeft, Plus, Search, BookOpen, Wallet, Library, LayoutDashboard, ArrowRightLeft, Gift, Settings, Pin, Film, PlaySquare, BrainCircuit } from 'lucide-react';
import { useStore } from '../store/useStore';
import SidebarItem from './SidebarItem';
import SettingsModal from './SettingsModal';

interface SidebarProps {
  onCreatePage: (parentId: string | null) => Promise<void>;
  onUpdatePage: (id: string, updates: Partial<any>) => Promise<void>;
}

export default function Sidebar({ onCreatePage, onUpdatePage }: SidebarProps) {
  const { state, dispatch } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  const [visiblePinnedCount, setVisiblePinnedCount] = useState(10);
  const [visiblePagesCount, setVisiblePagesCount] = useState(10);

  const pinnedPages = state.pages
    .filter(p => p.is_pinned)
    .sort((a, b) => (a.pinned_order || 0) - (b.pinned_order || 0));

  const rootPages = state.pages
    .filter((p) => p.parent_id === null && !p.is_pinned)
    .sort((a, b) => a.sort_order - b.sort_order);

  const filteredPages = searchQuery.trim()
    ? state.pages.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : rootPages;

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId === targetId) return;
    
    const currentPinned = [...pinnedPages];
    const draggedIdx = currentPinned.findIndex(p => p.id === draggedId);
    const targetIdx = currentPinned.findIndex(p => p.id === targetId);
    
    if (draggedIdx === -1 || targetIdx === -1) return;
    
    const [draggedItem] = currentPinned.splice(draggedIdx, 1);
    currentPinned.splice(targetIdx, 0, draggedItem);
    
    currentPinned.forEach((p, idx) => {
      if (p.pinned_order !== idx) {
        onUpdatePage(p.id, { pinned_order: idx });
      }
    });
  };

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0];
  const activeModule = activeTab.module;

  if (state.sidebarCollapsed) {
    return (
      <>
        {/* Mobile: Floating open button */}
        {!state.isReadingModeFullScreen && (
          <div className="md:hidden fixed top-4 left-0 z-[90]">
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className="p-2 bg-dark-card/80 backdrop-blur-md rounded-r-xl border border-l-0 border-white/10 text-dark-subtext hover:text-white shadow-xl active:scale-95 transition-all"
            title="Expandir menu"
          >
            <PanelLeft size={18} />
          </button>
        </div>
        )}

        {/* Desktop: Slim Sidebar */}
        <div className="hidden md:flex w-12 h-full bg-dark-card/50 border-r border-white/5 flex-col items-center py-4 gap-4 z-20">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="p-2 rounded-lg hover:bg-white/5 text-dark-subtext hover:text-dark-text transition-all active:scale-95"
          title="Expandir sidebar"
        >
          <PanelLeft size={18} />
        </button>
        {activeModule === 'notes' && (
          <button
            onClick={() => onCreatePage(null)}
            className="p-2 rounded-lg hover:bg-brand-500/20 text-dark-subtext hover:text-brand-400 transition-all active:scale-95"
            title="Nova página"
          >
            <Plus size={18} />
          </button>
        )}
        <div className="mt-auto flex flex-col gap-4">
          <button
            onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'notes' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              activeModule === 'notes' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Caderno"
          >
            <BookOpen size={18} />
          </button>
          <button
            onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'library' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              activeModule === 'library' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Biblioteca"
          >
            <Library size={18} />
          </button>
          <button
            onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'finance' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              activeModule === 'finance' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Finanças"
          >
            <Wallet size={18} />
          </button>
          <button
            onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'culture' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              activeModule === 'culture' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Cultura"
          >
            <Film size={18} />
          </button>
          <button
            onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'video' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              activeModule === 'video' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Vídeos"
          >
            <PlaySquare size={18} />
          </button>
          <button
            onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'anki' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              activeModule === 'anki' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Flashcards"
          >
            <BrainCircuit size={18} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-white/5 text-dark-subtext hover:text-dark-text transition-all active:scale-95"
            title="Configurações"
          >
            <Settings size={18} />
          </button>
        </div>
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
         className="md:hidden fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity"
         onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
      />
      
      {/* Sidebar Container */}
      <div className="fixed md:relative z-[70] md:z-20 w-[260px] h-full bg-dark-bg md:bg-dark-card/50 border-r border-white/5 flex flex-col shadow-2xl md:shadow-none animate-slide-right md:animate-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          {activeModule === 'notes' ? (
            <BookOpen size={20} className="text-brand-400" />
          ) : activeModule === 'library' ? (
            <Library size={20} className="text-brand-400" />
          ) : activeModule === 'culture' ? (
            <Film size={20} className="text-brand-400" />
          ) : activeModule === 'video' ? (
            <PlaySquare size={20} className="text-brand-400" />
          ) : activeModule === 'anki' ? (
            <BrainCircuit size={20} className="text-brand-400" />
          ) : (
            <Wallet size={20} className="text-brand-400" />
          )}
          <span className="font-semibold text-sm">
            {activeModule === 'notes' ? 'Caderno' : activeModule === 'library' ? 'Biblioteca' : activeModule === 'culture' ? 'Cultura' : activeModule === 'video' ? 'Vídeos' : activeModule === 'anki' ? 'Flashcards' : 'Finanças'}
          </span>
        </div>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="p-1.5 rounded-lg hover:bg-white/5 text-dark-subtext hover:text-dark-text transition-all active:scale-95"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {activeModule === 'notes' && (
        <>
          {/* Search */}
          <div className="px-3 py-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-subtext" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar páginas..."
                className="w-full bg-white/5 border border-white/5 rounded-lg pl-8 pr-3 py-1.5 text-xs text-dark-text placeholder-dark-subtext focus:outline-none focus:border-brand-500/50 transition-colors"
              />
            </div>
          </div>

          {/* New Page Button */}
          <div className="px-3 py-1">
            <button
              onClick={() => onCreatePage(null)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all active:scale-[0.98]"
            >
              <Plus size={14} className="text-brand-400" />
              <span>Nova Página</span>
            </button>
          </div>
        </>
      )}

      {/* Tree */}
      <div 
        className="flex-1 overflow-y-auto px-2 py-1 pb-20"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('application/caderno-page')) {
            e.preventDefault();
          }
        }}
        onDrop={(e) => {
          const draggedId = e.dataTransfer.getData('application/caderno-page');
          if (draggedId) {
            onUpdatePage(draggedId, { parent_id: null });
          }
        }}
      >
        {activeModule === 'notes' ? (
          <>
            {!searchQuery && pinnedPages.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-1 text-xs font-semibold text-dark-subtext uppercase tracking-wider flex items-center gap-1">
                  <Pin size={12} /> Fixados
                </div>
                {pinnedPages.slice(0, visiblePinnedCount).map((page) => (
                  <div
                    key={page.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, page.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, page.id)}
                  >
                    <SidebarItem
                      page={page}
                      depth={0}
                      activePageId={activeTab?.pageId || null}
                      onCreatePage={onCreatePage}
                      onUpdatePage={onUpdatePage}
                      isSearchResult={false}
                      disableHierarchyDnD={true}
                    />
                  </div>
                ))}
                {!searchQuery && pinnedPages.length > visiblePinnedCount && (
                  <button
                    onClick={() => setVisiblePinnedCount(prev => prev + 10)}
                    className="w-full text-left px-4 py-1.5 mt-1 text-xs text-brand-400 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Exibir mais ({pinnedPages.length - visiblePinnedCount})
                  </button>
                )}
              </div>
            )}
            
            {!searchQuery && pinnedPages.length > 0 && (
              <div className="px-3 py-1 text-xs font-semibold text-dark-subtext uppercase tracking-wider mt-2">
                Páginas
              </div>
            )}

            {filteredPages.length === 0 && (
              <div className="text-center text-dark-subtext text-xs py-8 px-4">
                {searchQuery ? 'Nenhuma página encontrada' : 'Nenhuma página criada'}
              </div>
            )}
            {filteredPages.slice(0, visiblePagesCount).map((page) => (
              <SidebarItem
                key={page.id}
                page={page}
                depth={searchQuery ? 0 : 0}
                activePageId={activeTab?.pageId || null}
                onCreatePage={onCreatePage}
                onUpdatePage={onUpdatePage}
                isSearchResult={!!searchQuery}
                disableHierarchyDnD={!!searchQuery}
              />
            ))}
            {!searchQuery && filteredPages.length > visiblePagesCount && (
              <button
                onClick={() => setVisiblePagesCount(prev => prev + 10)}
                className="w-full text-left px-4 py-1.5 mt-1 text-xs text-brand-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                Exibir mais ({filteredPages.length - visiblePagesCount})
              </button>
            )}
          </>
        ) : activeModule === 'library' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Biblioteca de PDFs</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Use o painel principal para gerenciar seus livros e coleções.</div>
          </div>
        ) : activeModule === 'culture' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Área Cultura</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Gerencie seus filmes, séries, livros e animes no painel principal.</div>
          </div>
        ) : activeModule === 'video' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Player Video</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Seus vídeos com legendas interativas para estudo.</div>
          </div>
        ) : activeModule === 'anki' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Flashcards</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Revise seus cartões espaçadamente.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 mt-2">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-text bg-white/5">
              <LayoutDashboard size={16} className="text-brand-400" />
              <span>Visão Geral</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all">
              <ArrowRightLeft size={16} className="text-brand-400" />
              <span>Transações</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all">
              <Gift size={16} className="text-brand-400" />
              <span>Desejos & Futuro</span>
            </button>
          </div>
        )}
      </div>

      {/* Module Switcher (Footer) */}
      <div className="p-3 border-t border-white/5 flex flex-col gap-1">
        <button
          onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'notes' })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            activeModule === 'notes'
              ? 'bg-brand-500/10 text-brand-400'
              : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
          }`}
        >
          <BookOpen size={16} />
          <span>Caderno</span>
        </button>
        <button
          onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'library' })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            activeModule === 'library'
              ? 'bg-brand-500/10 text-brand-400'
              : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
          }`}
        >
          <Library size={16} />
          <span>Biblioteca</span>
        </button>
        <button
          onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'finance' })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            activeModule === 'finance'
              ? 'bg-brand-500/10 text-brand-400'
              : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
          }`}
        >
          <Wallet size={16} />
          <span>Finanças</span>
        </button>
        <button
          onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'culture' })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            activeModule === 'culture'
              ? 'bg-brand-500/10 text-brand-400'
              : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
          }`}
        >
          <Film size={16} />
          <span>Cultura</span>
        </button>
        <button
          onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'video' })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            activeModule === 'video'
              ? 'bg-brand-500/10 text-brand-400'
              : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
          }`}
        >
          <PlaySquare size={16} />
          <span>Vídeos</span>
        </button>
        <button
          onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'anki' })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            activeModule === 'anki'
              ? 'bg-brand-500/10 text-brand-400'
              : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
          }`}
        >
          <BrainCircuit size={16} />
          <span>Flashcards</span>
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all"
        >
          <Settings size={16} />
          <span>Configurações</span>
        </button>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </div>
    </>
  );
}

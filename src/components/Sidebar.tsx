import { useState, useEffect } from 'react';
import { PanelLeftClose, PanelLeft, Plus, Search, BookOpen, Wallet, Library, LayoutDashboard, ArrowRightLeft, Gift, Settings, Pin, Film, PlaySquare, BrainCircuit, Timer, ChevronUp, ChevronDown, Calendar as CalendarIcon, FolderOpen, Shield, Mic } from 'lucide-react';
import { useStore } from '../store/useStore';
import SidebarItem from './SidebarItem';
import SettingsModal from './SettingsModal';
import { useMouseDrag } from '../hooks/useMouseDrag';

function PinnedSidebarItem({ page, activeTab, onCreatePage, onUpdatePage, index, onDropPinned }: any) {
  const { handleMouseDown } = useMouseDrag({
    id: page.id,
    type: 'pinned-page',
    getGhostContent: () => {
      const el = document.createElement('div');
      el.className = 'bg-dark-bg text-dark-text border border-brand-500 rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-xl text-xs font-medium';
      el.innerHTML = `<span>${page.icon || '📄'}</span><span>${page.title}</span>`;
      return el;
    },
    onDrop: (targetId) => {
      if (targetId) {
        onDropPinned(page.id, targetId);
      }
    }
  });

  return (
    <div
      data-droppable-type="pinned-page"
      data-droppable-id={page.id}
      onMouseDownCapture={handleMouseDown}
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
  );
}

interface SidebarProps {
  onCreatePage: (parentId: string | null) => Promise<void>;
  onUpdatePage: (id: string, updates: Partial<any>) => Promise<void>;
}

export default function Sidebar({ onCreatePage, onUpdatePage }: SidebarProps) {
  const { state, dispatch } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isModulesExpanded, setIsModulesExpanded] = useState(() => {
    const saved = localStorage.getItem('caderno_modules_expanded');
    return saved ? JSON.parse(saved) : true;
  });
  
  const toggleModules = () => {
    setIsModulesExpanded((prev: boolean) => {
      const next = !prev;
      localStorage.setItem('caderno_modules_expanded', JSON.stringify(next));
      return next;
    });
  };
  
  const [visiblePinnedCount, setVisiblePinnedCount] = useState(10);
  const [visiblePagesCount, setVisiblePagesCount] = useState(10);

  const pinnedPages = state.pages
    .filter(p => p.is_pinned)
    .sort((a, b) => (a.pinned_order || 0) - (b.pinned_order || 0));

  const rootPages = state.pages
    .filter((p) => p.parent_id === null && !p.is_pinned)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const filteredPages = searchQuery.trim()
    ? state.pages.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : rootPages;

  const handleDropPinned = (draggedId: string, targetId: string) => {
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

  // Listen for mouse-based drag drops on empty sidebar area (unparent page)
  useEffect(() => {
    const onDragDrop = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const treeEl = document.getElementById('sidebar-page-tree');
      if (!treeEl) return;
      
      // Check if dropped on the tree container but NOT on any SidebarItem
      const targetEl = document.elementFromPoint(detail.x, detail.y);
      if (!targetEl) return;
      
      // If the target is the tree container itself (empty area), unparent
      if (targetEl === treeEl || targetEl.id === 'sidebar-page-tree') {
        onUpdatePage(detail.pageId, { parent_id: null });
      }
    };
    
    window.addEventListener('caderno-drag-drop', onDragDrop);
    return () => window.removeEventListener('caderno-drag-drop', onDragDrop);
  }, [onUpdatePage]);

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
            onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'focus' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              activeModule === 'focus' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Foco"
          >
            <Timer size={18} />
          </button>
          <button
            onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'calendar' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              activeModule === 'calendar' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Agenda"
          >
            <CalendarIcon size={18} />
          </button>
          <button
            onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'files' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              activeModule === 'files' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Arquivos"
          >
            <FolderOpen size={18} />
          </button>
          <button
            onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'vault' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              activeModule === 'vault' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Cofre"
          >
            <Shield size={18} />
          </button>
          <button
            onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'practice' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              activeModule === 'practice' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Prática"
          >
            <Mic size={18} />
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
          ) : activeModule === 'focus' ? (
            <Timer size={20} className="text-brand-400" />
          ) : activeModule === 'calendar' ? (
            <CalendarIcon size={20} className="text-brand-400" />
          ) : activeModule === 'files' ? (
            <FolderOpen size={20} className="text-brand-400" />
          ) : activeModule === 'vault' ? (
            <Shield size={20} className="text-brand-400" />
          ) : activeModule === 'practice' ? (
            <Mic size={20} className="text-brand-400" />
          ) : (
            <Wallet size={20} className="text-brand-400" />
          )}
          <span className="font-semibold text-sm">
            {activeModule === 'notes' ? 'Caderno' : activeModule === 'library' ? 'Biblioteca' : activeModule === 'culture' ? 'Cultura' : activeModule === 'video' ? 'Vídeos' : activeModule === 'anki' ? 'Flashcards' : activeModule === 'focus' ? 'Foco' : activeModule === 'calendar' ? 'Agenda' : activeModule === 'files' ? 'Arquivos' : activeModule === 'vault' ? 'Cofre' : activeModule === 'practice' ? 'Prática' : 'Finanças'}
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
        id="sidebar-page-tree"
      >
        {activeModule === 'notes' ? (
          <>
            {!searchQuery && pinnedPages.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-1 text-xs font-semibold text-dark-subtext uppercase tracking-wider flex items-center gap-1">
                  <Pin size={12} /> Fixados
                </div>
                {pinnedPages.slice(0, visiblePinnedCount).map((page, index) => (
                  <PinnedSidebarItem
                    key={page.id}
                    page={page}
                    index={index}
                    activeTab={activeTab}
                    onCreatePage={onCreatePage}
                    onUpdatePage={onUpdatePage}
                    onDropPinned={handleDropPinned}
                  />
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
        ) : activeModule === 'focus' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Foco</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Gerencie suas sessões de foco e cronômetros.</div>
          </div>
        ) : activeModule === 'calendar' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Agenda</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Gerencie seus compromissos e tarefas diárias.</div>
          </div>
        ) : activeModule === 'files' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Arquivos</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Gerencie seus arquivos, PDFs e documentos.</div>
          </div>
        ) : activeModule === 'vault' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Cofre de Senhas</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Proteja suas credenciais e senhas com segurança máxima.</div>
          </div>
        ) : activeModule === 'practice' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Prática de Inglês</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Converse fluentemente com o seu parceiro IA e aperfeiçoe seu idioma.</div>
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
      <div className="border-t border-white/5 flex flex-col">
        <button
          onClick={() => setIsModulesExpanded(!isModulesExpanded)}
          className="flex items-center justify-between w-full p-3 text-xs font-semibold text-dark-subtext uppercase tracking-wider hover:bg-white/5 transition-colors group"
        >
          <span>Módulos</span>
          {isModulesExpanded ? (
            <ChevronDown size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
          ) : (
            <ChevronUp size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
        
        {isModulesExpanded && (
          <div className="flex flex-col gap-1 px-3 pb-3">
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
              onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'focus' })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                activeModule === 'focus'
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
              }`}
            >
              <Timer size={16} />
              <span>Foco</span>
            </button>
            <button
              onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'calendar' })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                activeModule === 'calendar'
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
              }`}
            >
              <CalendarIcon size={16} />
              <span>Agenda</span>
            </button>
            <button
              onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'files' })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                activeModule === 'files'
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
              }`}
            >
              <FolderOpen size={16} />
              <span>Arquivos</span>
            </button>
            <button
              onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'vault' })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                activeModule === 'vault'
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
              }`}
            >
              <Shield size={16} />
              <span>Cofre</span>
            </button>
            <button
              onClick={() => dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: 'practice' })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                activeModule === 'practice'
                  ? 'bg-brand-500/10 text-brand-400'
                  : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
              }`}
            >
              <Mic size={16} />
              <span>Prática</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-dark-subtext hover:text-dark-text hover:bg-white/5 transition-all mt-2"
            >
              <Settings size={16} />
              <span>Configurações</span>
            </button>
          </div>
        )}
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      </div>
    </>
  );
}

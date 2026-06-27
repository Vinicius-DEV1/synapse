import { useState } from 'react';
import { PanelLeftClose, PanelLeft, Plus, Search, BookOpen, Wallet, Library, LayoutDashboard, ArrowRightLeft, Gift, Settings } from 'lucide-react';
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

  const rootPages = state.pages
    .filter((p) => p.parent_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  const filteredPages = searchQuery.trim()
    ? state.pages.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : rootPages;

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId);

  if (state.sidebarCollapsed) {
    return (
      <div className="w-12 h-full bg-dark-card/50 border-r border-white/5 flex flex-col items-center py-4 gap-4">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="p-2 rounded-lg hover:bg-white/5 text-dark-subtext hover:text-dark-text transition-all active:scale-95"
          title="Expandir sidebar"
        >
          <PanelLeft size={18} />
        </button>
        {state.activeModule === 'notes' && (
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
            onClick={() => dispatch({ type: 'SET_ACTIVE_MODULE', module: 'notes' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              state.activeModule === 'notes' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Caderno"
          >
            <BookOpen size={18} />
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_MODULE', module: 'library' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              state.activeModule === 'library' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Biblioteca"
          >
            <Library size={18} />
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_ACTIVE_MODULE', module: 'finance' })}
            className={`p-2 rounded-lg transition-all active:scale-95 ${
              state.activeModule === 'finance' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
            title="Finanças"
          >
            <Wallet size={18} />
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
    );
  }

  return (
    <div className="w-[260px] h-full bg-dark-card/50 border-r border-white/5 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          {state.activeModule === 'notes' ? (
            <BookOpen size={20} className="text-brand-400" />
          ) : state.activeModule === 'library' ? (
            <Library size={20} className="text-brand-400" />
          ) : (
            <Wallet size={20} className="text-brand-400" />
          )}
          <span className="font-semibold text-sm">
            {state.activeModule === 'notes' ? 'Caderno' : state.activeModule === 'library' ? 'Biblioteca' : 'Finanças'}
          </span>
        </div>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="p-1.5 rounded-lg hover:bg-white/5 text-dark-subtext hover:text-dark-text transition-all active:scale-95"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {state.activeModule === 'notes' && (
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
      <div className="flex-1 overflow-y-auto px-2 py-1">
        {state.activeModule === 'notes' ? (
          <>
            {filteredPages.length === 0 && (
              <div className="text-center text-dark-subtext text-xs py-8 px-4">
                {searchQuery ? 'Nenhuma página encontrada' : 'Nenhuma página criada'}
              </div>
            )}
            {filteredPages.map((page) => (
              <SidebarItem
                key={page.id}
                page={page}
                depth={searchQuery ? 0 : 0}
                activePageId={activeTab?.pageId || null}
                onCreatePage={onCreatePage}
                onUpdatePage={onUpdatePage}
                isSearchResult={!!searchQuery}
              />
            ))}
          </>
        ) : state.activeModule === 'library' ? (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">Biblioteca de PDFs</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">Use o painel principal para gerenciar seus livros e coleções.</div>
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
          onClick={() => dispatch({ type: 'SET_ACTIVE_MODULE', module: 'notes' })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            state.activeModule === 'notes'
              ? 'bg-brand-500/10 text-brand-400'
              : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
          }`}
        >
          <BookOpen size={16} />
          <span>Caderno</span>
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_ACTIVE_MODULE', module: 'library' })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            state.activeModule === 'library'
              ? 'bg-brand-500/10 text-brand-400'
              : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
          }`}
        >
          <Library size={16} />
          <span>Biblioteca</span>
        </button>
        <button
          onClick={() => dispatch({ type: 'SET_ACTIVE_MODULE', module: 'finance' })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            state.activeModule === 'finance'
              ? 'bg-brand-500/10 text-brand-400'
              : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
          }`}
        >
          <Wallet size={16} />
          <span>Finanças</span>
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
  );
}

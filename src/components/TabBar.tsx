import { Plus, X, FileText, Library, Wallet } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function TabBar() {
  const { state, dispatch } = useStore();

  const handleNewTab = () => {
    const tabId = 'tab_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    dispatch({
      type: 'ADD_TAB',
      tab: { id: tabId, module: 'notes', pageId: null, unsavedContent: null, scrollY: 0 },
    });
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    dispatch({ type: 'CLOSE_TAB', tabId });
  };

  const handleSelectTab = (tabId: string) => {
    dispatch({ type: 'SET_ACTIVE_TAB', tabId });
  };

  return (
    <div className="h-[42px] bg-dark-card/30 border-b border-white/5 flex items-end px-1 gap-0.5 overflow-x-auto">
      {state.tabs.map((tab) => {
        const isActive = tab.id === state.activeTabId;
        
        let title = 'Nova Aba';
        let icon = <FileText size={13} className="flex-shrink-0 text-dark-subtext" />;

        if (tab.module === 'notes') {
          const page = tab.pageId ? state.pages.find((p) => p.id === tab.pageId) : null;
          title = page?.title || 'Nova Página';
          icon = page?.icon ? <span className="text-sm flex-shrink-0">{page.icon}</span> : <FileText size={13} className="flex-shrink-0 text-dark-subtext" />;
        } else if (tab.module === 'library') {
          title = tab.bookTitle || 'Biblioteca';
          icon = <Library size={13} className="flex-shrink-0 text-dark-subtext" />;
        } else if (tab.module === 'finance') {
          title = 'Finanças';
          icon = <Wallet size={13} className="flex-shrink-0 text-dark-subtext" />;
        }

        return (
          <button
            key={tab.id}
            onClick={() => handleSelectTab(tab.id)}
            className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-xl min-w-[120px] max-w-[200px] transition-all ${
              isActive
                ? 'bg-dark-bg text-dark-text border-t-2 border-x border-brand-500 border-x-white/5'
                : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
            }`}
          >
            {icon}
            <span className="truncate flex-1 text-left">{title}</span>
            {state.tabs.length > 1 && (
              <span
                onClick={(e) => handleCloseTab(e, tab.id)}
                className={`p-0.5 rounded-md transition-all flex-shrink-0 ${
                  isActive
                    ? 'hover:bg-white/10 text-dark-subtext hover:text-dark-text'
                    : 'opacity-0 group-hover:opacity-100 hover:bg-white/10 text-dark-subtext hover:text-dark-text'
                }`}
              >
                <X size={12} />
              </span>
            )}
          </button>
        );
      })}

      {/* New Tab Button */}
      <button
        onClick={handleNewTab}
        className="flex-shrink-0 p-2 rounded-lg text-dark-subtext hover:text-brand-400 hover:bg-white/5 transition-all active:scale-95 mb-0.5"
        title="Nova aba"
      >
        <Plus size={15} />
      </button>

      {/* Spacer to push AI button to the right */}
      <div className="flex-1"></div>

      {/* AI Sidebar Toggle */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_AI_SIDEBAR' })}
        className={`flex-shrink-0 flex items-center gap-2 px-3 py-1.5 mx-2 mb-1 rounded-lg text-xs font-medium transition-colors ${
          state.showAiSidebar 
            ? 'bg-brand-500/20 text-brand-400' 
            : 'text-dark-subtext hover:text-brand-400 hover:bg-brand-500/10'
        }`}
        title="Chats Ativos (IA)"
      >
        <span className="text-[14px]">✨</span>
        <span className="hidden sm:inline">Assistente</span>
        {Object.keys(state.aiChatSessions || {}).length > 0 && (
          <span className="bg-brand-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
            {Object.keys(state.aiChatSessions || {}).length}
          </span>
        )}
      </button>
    </div>
  );
}

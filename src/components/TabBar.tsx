import { Plus, X, FileText } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function TabBar() {
  const { state, dispatch } = useStore();

  const handleNewTab = () => {
    const tabId = 'tab_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    dispatch({
      type: 'ADD_TAB',
      tab: { id: tabId, pageId: null, unsavedContent: null, scrollY: 0 },
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
        const page = tab.pageId
          ? state.pages.find((p) => p.id === tab.pageId)
          : null;
        const isActive = tab.id === state.activeTabId;
        const title = page?.title || 'Nova Aba';
        const icon = page?.icon || null;

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
            {icon ? (
              <span className="text-sm flex-shrink-0">{icon}</span>
            ) : (
              <FileText size={13} className="flex-shrink-0 text-dark-subtext" />
            )}
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
    </div>
  );
}

import { memo, useMemo, useCallback } from 'react';
import { Plus, X, FileText, Library, Settings } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DndContext, useSensor, useSensors, PointerSensor, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { MAIN_MODULES, SPECIAL_MODULES } from './sidebar/modules.config';
import NotificationBell from '../notifications/NotificationBell';

interface TabItemProps {
  tab: any;
  index: number;
  isActive: boolean;
  page: any;
  onSelect: (id: string) => void;
  onClose: (e: React.MouseEvent, id: string) => void;
  onDropTab: (sourceIndex: number, targetIndex: number) => void;
  tabCount: number;
}

const TabItem = memo(function TabItem({ tab, index, isActive, page, onSelect, onClose, tabCount }: TabItemProps) {
  let title = 'Nova Aba';
  let icon = <FileText size={13} className="flex-shrink-0 text-dark-subtext" />;

  const moduleConfig = [...MAIN_MODULES, ...SPECIAL_MODULES].find(m => m.id === tab.module);

  if (tab.module === 'notes') {
    title = page?.title || 'Nova Página';
    icon = page?.icon ? <span className="text-sm flex-shrink-0">{page.icon}</span> : <FileText size={13} className="flex-shrink-0 text-dark-subtext" />;
  } else if (tab.module === 'library' && tab.bookTitle) {
    title = tab.bookTitle;
    icon = <Library size={13} className="flex-shrink-0 text-dark-subtext" />;
  } else if (tab.module === 'settings') {
    title = 'Configurações';
    icon = <Settings size={13} className="flex-shrink-0 text-dark-subtext" />;
  } else if (moduleConfig) {
    title = moduleConfig.label;
    const Icon = moduleConfig.icon;
    icon = <Icon size={13} className="flex-shrink-0 text-dark-subtext" />;
  }

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `tab-${index}`,
    data: { type: 'tab', index },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `tab-${index}`,
    data: { type: 'tab', index },
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onSelect(tab.id)}
      className={`group relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t-xl min-w-[120px] max-w-[200px] transition-all ${
        isOver ? 'ring-1 ring-brand-500' : ''
      } ${
        isActive
          ? 'bg-dark-bg text-dark-text border-t-2 border-x border-brand-500 border-x-white/5'
          : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      {icon}
      <span className="truncate flex-1 text-left">{title}</span>
      {tabCount > 1 && (
        <span
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => onClose(e, tab.id)}
          className={`p-0.5 rounded-md transition-all flex-shrink-0 ${
            isActive
              ? 'hover:bg-white/10 text-dark-subtext hover:text-dark-text'
              : 'opacity-0 group-hover:opacity-100 hover:bg-white/10 text-dark-subtext hover:text-dark-text'
          }`}
          title="Fechar aba"
        >
          <X size={12} />
        </span>
      )}
    </button>
  );
});

export default function TabBar() {
  const { state, dispatch } = useStore();

  const handleNewTab = useCallback(() => {
    window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
    const tabId = 'tab_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    dispatch({
      type: 'ADD_TAB',
      tab: { id: tabId, module: 'notes', pageId: null, unsavedContent: null, scrollY: 0 },
    });
  }, [dispatch]);

  const handleCloseTab = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
    dispatch({ type: 'CLOSE_TAB', tabId });
  }, [dispatch]);

  const handleSelectTab = useCallback((tabId: string) => {
    window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
    dispatch({ type: 'SET_ACTIVE_TAB', tabId });
  }, [dispatch]);

  const handleDropTab = useCallback((sourceIndex: number, targetIndex: number) => {
    dispatch({ type: 'REORDER_TABS', sourceIndex, targetIndex });
  }, [dispatch]);

  const pageMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of state.pages) {
      map.set(p.id, p);
    }
    return map;
  }, [state.pages]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    try {
      const { active, over } = e;
      if (active && over && active.id !== over.id) {
        if (active.data.current?.type === 'tab' && over.data.current?.type === 'tab') {
          const sourceIndex = active.data.current.index;
          const targetIndex = over.data.current.index;
          if (typeof sourceIndex === 'number' && typeof targetIndex === 'number') {
            handleDropTab(sourceIndex, targetIndex);
          }
        }
      }
    } catch (err) {
      console.error('[TabBar] Erro ao reordenar abas:', err);
    }
  }, [handleDropTab]);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="h-[42px] bg-dark-card/30 border-b border-white/5 flex items-end px-1 gap-0.5 overflow-x-auto">
      {state.tabs.map((tab, index) => {
        const isActive = tab.id === state.activeTabId;
        const page = tab.pageId ? pageMap.get(tab.pageId) || null : null;
        return (
          <TabItem
            key={tab.id}
            tab={tab}
            index={index}
            isActive={isActive}
            page={page}
            onSelect={handleSelectTab}
            onClose={handleCloseTab}
            onDropTab={handleDropTab}
            tabCount={state.tabs.length}
          />
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

      {/* Central de Notificações (Sino) */}
      <NotificationBell />

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
      </button>
    </div>
    </DndContext>
  );
}

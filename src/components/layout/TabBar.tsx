import { memo, useMemo, useCallback, useState, useEffect, useRef, Fragment } from 'react';
import { Plus, X, FileText, Library, Settings, PanelLeft, Pin, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Tab, Page } from '../../types';
import { DndContext, useSensor, useSensors, PointerSensor, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core';
import { MODULE_CONFIG_MAP } from './sidebar/modules.config';
import NotificationBell from '../notifications/NotificationBell';
import WindowControls from './WindowControls';
import TabContextMenu from './TabContextMenu';
import { triggerHaptic } from '../../services/haptics';
import { isDesktopApp } from '../../services/platform';
import { windowService } from '../../services/windowService';
import { getSettings } from '../../utils/settings';

interface TabItemProps {
  tab: Tab;
  index: number;
  isActive: boolean;
  page: Page | null | undefined;
  onSelect: (id: string) => void;
  onClose: (e: React.MouseEvent, id: string) => void;
  onDropTab: (sourceIndex: number, targetIndex: number) => void;
  tabCount: number;
  onContextMenu: (e: React.MouseEvent, tab: Tab) => void;
  compactPinnedTabs?: boolean;
  tabMaxWidth?: number;
}

const TabItem = memo(function TabItem({
  tab,
  index,
  isActive,
  page,
  onSelect,
  onClose,
  tabCount,
  onContextMenu,
  compactPinnedTabs,
  tabMaxWidth = 400,
}: TabItemProps) {
  let title = 'Nova Aba';
  let icon = <FileText size={13} className="flex-shrink-0 text-dark-subtext" />;

  const moduleConfig = MODULE_CONFIG_MAP.get(tab.module);

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
      data-active-tab={isActive}
      onClick={() => onSelect(tab.id)}
      title={title}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e, tab);
      }}
      style={!tab.isPinned ? { maxWidth: `${tabMaxWidth}px` } : undefined}
      className={`group relative flex items-center px-3 py-2 text-xs font-medium rounded-t-xl transition-all duration-300 ease-out overflow-hidden ${
        tab.isPinned 
          ? compactPinnedTabs 
            ? 'w-10 min-w-[40px] max-w-[40px] !px-0 justify-center gap-0' 
            : 'min-w-[90px] max-w-[160px] gap-1.5'
          : 'min-w-[120px] gap-1.5'
      } h-[38px] ${
        isOver ? 'ring-1 ring-brand-500' : ''
      } ${
        isActive
          ? 'bg-dark-bg text-dark-text border-t-2 border-x border-brand-500 border-x-white/5 shadow-sm'
          : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
      } ${isDragging ? 'opacity-50' : ''}`}
    >
      {icon}
      {(!tab.isPinned || !compactPinnedTabs) && (
        <span className="truncate flex-1 text-left">
          {title}
        </span>
      )}
      {tab.isPinned ? (
        !compactPinnedTabs && (
          <span
            className="p-0.5 rounded-md text-brand-400 flex-shrink-0"
            title="Aba fixada"
          >
            <Pin size={11} className="fill-brand-400/20 rotate-45" />
          </span>
        )
      ) : (
        tabCount > 1 && (
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
        )
      )}
    </button>
  );
});

export default function TabBar() {
  const { state, dispatch } = useStore();
  const tabStripRef = useRef<HTMLDivElement>(null);
  const [tabContextMenu, setTabContextMenu] = useState<{
    x: number;
    y: number;
    tab: Tab;
  } | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [compactPinnedTabs, setCompactPinnedTabs] = useState(() => getSettings().compactPinnedTabs ?? true);
  const [tabMaxWidth, setTabMaxWidth] = useState(() => getSettings().tabMaxWidth ?? 400);

  useEffect(() => {
    const handler = () => {
      const s = getSettings();
      setCompactPinnedTabs(s.compactPinnedTabs ?? true);
      setTabMaxWidth(s.tabMaxWidth ?? 400);
    };
    window.addEventListener('app-settings-changed', handler);
    return () => window.removeEventListener('app-settings-changed', handler);
  }, []);

  const checkScroll = useCallback(() => {
    const el = tabStripRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = tabStripRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, state.tabs.length]);

  // Automatically scroll active tab into view when active tab changes
  useEffect(() => {
    if (!tabStripRef.current || !state.activeTabId) return;
    const activeEl = tabStripRef.current.querySelector<HTMLElement>('[data-active-tab="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [state.activeTabId]);

  // Translate mouse wheel scrolling into horizontal tab strip scrolling with delta normalization and precise edge clamping
  const handleWheel = useCallback((e: React.WheelEvent<HTMLElement>) => {
    const el = tabStripRef.current;
    if (!el) return;

    let delta = e.deltaY;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      delta = e.deltaX;
    }
    if (!delta) return;

    // Normalize delta across line vs pixel modes (e.g. Linux mice with DOM_DELTA_LINE)
    if (e.deltaMode === 1) {
      delta *= 35;
    } else if (e.deltaMode === 2) {
      delta *= 100;
    }

    const maxScroll = el.scrollWidth - el.clientWidth;
    let targetScroll = el.scrollLeft + delta;

    if (maxScroll > 0) {
      // Clean snap to 0% at the start
      if (targetScroll <= 8) {
        targetScroll = 0;
      }
      // Clean snap to 100% at the end
      else if (targetScroll >= maxScroll - 8) {
        targetScroll = maxScroll;
      }
    }

    el.scrollLeft = targetScroll;
  }, []);

  const handleNewTab = useCallback(() => {
    triggerHaptic('medium');
    window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
    const tabId = 'tab_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    dispatch({
      type: 'ADD_TAB',
      tab: { id: tabId, module: 'notes', pageId: null, unsavedContent: null, scrollY: 0 },
    });
  }, [dispatch]);

  const handleCloseTab = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    triggerHaptic('light');
    window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
    dispatch({ type: 'CLOSE_TAB', tabId });
  }, [dispatch]);

  const handleSelectTab = useCallback((tabId: string) => {
    triggerHaptic('selection');
    window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
    dispatch({ type: 'SET_ACTIVE_TAB', tabId });
  }, [dispatch]);

  const handleDropTab = useCallback((sourceIndex: number, targetIndex: number) => {
    dispatch({ type: 'REORDER_TABS', sourceIndex, targetIndex });
  }, [dispatch]);

  const handleTabContextMenu = useCallback((e: React.MouseEvent, tab: Tab) => {
    e.preventDefault();
    e.stopPropagation();
    setTabContextMenu({
      x: e.clientX,
      y: e.clientY,
      tab,
    });
  }, []);

  const handleTogglePinTab = useCallback((tabId: string) => {
    triggerHaptic('selection');
    dispatch({ type: 'TOGGLE_PIN_TAB', tabId });
  }, [dispatch]);

  const handleCloseOtherTabs = useCallback((tabId: string) => {
    triggerHaptic('light');
    window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
    dispatch({ type: 'CLOSE_OTHER_TABS', tabId });
  }, [dispatch]);

  const handleCloseTabsToRight = useCallback((tabId: string) => {
    triggerHaptic('light');
    window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
    dispatch({ type: 'CLOSE_TABS_TO_RIGHT', tabId });
  }, [dispatch]);

  const handleDuplicateTab = useCallback((tabId: string) => {
    triggerHaptic('medium');
    window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
    dispatch({ type: 'DUPLICATE_TAB', tabId });
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

  const handleWindowMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDesktopApp()) return;
    const target = e.target as HTMLElement;
    if (
      target.closest(
        'button, input, textarea, a, select, [role="button"], [data-no-drag], [data-active-tab]'
      )
    ) {
      return;
    }
    if (e.buttons === 1) {
      windowService.startDragging();
    }
  }, []);

  const handleWindowDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!isDesktopApp()) return;
    const target = e.target as HTMLElement;
    if (
      target.closest(
        'button, input, textarea, a, select, [role="button"], [data-no-drag], [data-active-tab]'
      )
    ) {
      return;
    }
    windowService.toggleMaximize();
  }, []);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div 
        className="h-[46px] shrink-0 bg-dark-card/30 border-b border-white/5 flex items-center justify-between px-1 overflow-hidden select-none cursor-default"
        data-tauri-drag-region
        onMouseDown={handleWindowMouseDown}
        onDoubleClick={handleWindowDoubleClick}
        onWheel={handleWheel}
      >
        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={() => {
            triggerHaptic('light');
            dispatch({ type: 'TOGGLE_SIDEBAR' });
          }}
          className="md:hidden flex-shrink-0 p-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/5 transition-all active:scale-95 mb-0.5"
          title="Abrir menu"
          data-no-drag
        >
          <PanelLeft size={18} />
        </button>

        {/* Tab Strip Wrapper - Fixed width allocation with non-shifting overlay chevrons */}
        <div className="relative flex-1 flex items-end h-full min-w-0 overflow-hidden">
          {/* Left Scroll Chevron Overlay */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pr-4 bg-gradient-to-r from-dark-bg/95 via-dark-bg/80 to-transparent pointer-events-none">
              <button
                type="button"
                onClick={() => tabStripRef.current?.scrollBy({ left: -220, behavior: 'smooth' })}
                className="pointer-events-auto p-1.5 rounded-lg text-dark-subtext hover:text-white bg-dark-card/90 border border-white/10 hover:border-brand-500 shadow-md transition-all active:scale-95 ml-0.5 mb-0.5"
                title="Rolar abas para a esquerda"
                data-no-drag
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          )}

          {/* Scrolling Tab Strip - Horizontal scroll only, zero vertical scrollbar */}
          <div 
            ref={tabStripRef}
            className="w-full flex items-end h-full min-w-0 overflow-x-auto overflow-y-hidden tab-scrollbar gap-1 px-1"
          >
            {state.tabs.map((tab, index) => {
              const isActive = tab.id === state.activeTabId;
              const page = tab.pageId ? pageMap.get(tab.pageId) || null : null;
              const isLastPinned = tab.isPinned && !state.tabs[index + 1]?.isPinned;

              return (
                <Fragment key={tab.id}>
                  <TabItem
                    tab={tab}
                    index={index}
                    isActive={isActive}
                    page={page}
                    onSelect={handleSelectTab}
                    onClose={handleCloseTab}
                    onDropTab={handleDropTab}
                    tabCount={state.tabs.length}
                    onContextMenu={handleTabContextMenu}
                    compactPinnedTabs={compactPinnedTabs}
                    tabMaxWidth={tabMaxWidth}
                  />
                  {isLastPinned && index < state.tabs.length - 1 && (
                    <div className="h-5 w-px bg-white/10 mx-1 mb-2 self-center flex-shrink-0" />
                  )}
                </Fragment>
              );
            })}

            {/* New Tab Button */}
            <button
              onClick={handleNewTab}
              className="flex-shrink-0 p-2 rounded-lg text-dark-subtext hover:text-brand-400 hover:bg-white/5 transition-all active:scale-95 mb-0.5"
              title="Nova aba"
              data-no-drag
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Right Scroll Chevron Overlay */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center pl-4 bg-gradient-to-l from-dark-bg/95 via-dark-bg/80 to-transparent pointer-events-none">
              <button
                type="button"
                onClick={() => tabStripRef.current?.scrollBy({ left: 220, behavior: 'smooth' })}
                className="pointer-events-auto p-1.5 rounded-lg text-dark-subtext hover:text-white bg-dark-card/90 border border-white/10 hover:border-brand-500 shadow-md transition-all active:scale-95 mr-0.5 mb-0.5"
                title="Rolar abas para a direita"
                data-no-drag
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Small spacer before utility buttons */}
        <div className="w-2 h-full shrink-0" data-tauri-drag-region />

        {/* Pinned Utility Area - Fixed to the right, never scrolls vertically or horizontally */}
        <div className="flex items-center shrink-0 h-full pl-1 gap-0.5" data-tauri-drag-region={false}>
          {/* Central de Notificações (Sino) */}
          <NotificationBell />

          {/* Assistente IA (Ícone com tooltip flutuante ao passar o mouse) */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_AI_SIDEBAR' })}
            className={`group relative flex-shrink-0 flex items-center justify-center p-2 mx-0.5 rounded-lg text-xs font-medium transition-colors ${
              state.showAiSidebar 
                ? 'bg-brand-500/20 text-brand-400' 
                : 'text-dark-subtext hover:text-brand-400 hover:bg-brand-500/10'
            }`}
            title="Assistente IA (Chats Ativos)"
            aria-label="Assistente IA"
          >
            <span className="text-[15px] flex items-center justify-center">✨</span>

            {/* Floating tooltip on hover (pure CSS, zero layout shift) */}
            <span className="pointer-events-none absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-dark-card/95 border border-white/10 rounded-md text-[11px] font-medium text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 whitespace-nowrap">
              Assistente
            </span>
          </button>

          {/* Desktop Window Controls (Minimize, Maximize/Restore, Close) */}
          <WindowControls />
        </div>
      </div>

      {/* Context Menu on right click */}
      {tabContextMenu && (
        <TabContextMenu
          x={tabContextMenu.x}
          y={tabContextMenu.y}
          tab={tabContextMenu.tab}
          tabCount={state.tabs.length}
          hasTabsToRight={state.tabs.findIndex((t) => t.id === tabContextMenu.tab.id) < state.tabs.length - 1}
          onTogglePin={handleTogglePinTab}
          onCloseTab={(id) => {
            triggerHaptic('light');
            window.dispatchEvent(new CustomEvent('caderno-flush-editor'));
            dispatch({ type: 'CLOSE_TAB', tabId: id });
          }}
          onCloseOtherTabs={handleCloseOtherTabs}
          onCloseTabsToRight={handleCloseTabsToRight}
          onDuplicateTab={handleDuplicateTab}
          onNewTab={handleNewTab}
          onClose={() => setTabContextMenu(null)}
        />
      )}
    </DndContext>
  );
}


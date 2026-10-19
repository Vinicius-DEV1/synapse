import { useState, useEffect } from 'react';
import { Home, PanelLeftClose, PanelLeft, Shield, ChevronUp, ChevronDown, LayoutDashboard, Settings, Zap, Keyboard, HardDrive, DownloadCloud, RefreshCw, Video, Share2 } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import type { Tab, Page } from '../../../types';
import { SidebarModuleList } from './SidebarModuleList';
import { SidebarPageTree } from './SidebarPageTree';
import { MODULE_CONFIG_MAP } from './modules.config';
import { isDesktopApp } from '../../../services/platform';
import { windowService } from '../../../services/windowService';
import { useI18n } from '../../../i18n';

// UI navigates to 'settings' module as a tab,
// extending Tab['module'] support.
// Widen type definition to match actual runtime value.
type ModuleId = Tab['module'] | 'settings';

interface SidebarProps {
  onCreatePage: (parentId: string | null) => Promise<void>;
  onUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
}

export default function Sidebar({ onCreatePage, onUpdatePage }: SidebarProps) {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const [isModulesExpanded, setIsModulesExpanded] = useState(() => {
    const saved = localStorage.getItem('caderno_modules_expanded');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    if (window.api?.config) {
      window.api.config.get('caderno_modules_expanded').then((saved: unknown) => {
        if (typeof saved === 'boolean') {
          setIsModulesExpanded(saved);
        }
      }).catch(console.error);
    }
  }, []);

  const activeTab = state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0];
  const activeModule = activeTab.module as ModuleId;

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    if (!isDesktopApp()) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, select, [role="button"], [data-no-drag]')) return;
    if (e.buttons === 1) {
      windowService.startDragging();
    }
  };

  const handleHeaderDoubleClick = (e: React.MouseEvent) => {
    if (!isDesktopApp()) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, a, select, [role="button"], [data-no-drag]')) return;
    windowService.toggleMaximize();
  };

  if (state.sidebarCollapsed) {
    return (
      <div 
        className="hidden md:flex w-12 h-full bg-dark-card/50 border-r border-white/5 flex-col items-center py-2.5 z-20 select-none cursor-default"
        data-tauri-drag-region
        onMouseDown={handleHeaderMouseDown}
        onDoubleClick={handleHeaderDoubleClick}
      >
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="p-2 rounded-lg hover:bg-white/5 text-dark-subtext hover:text-dark-text transition-all active:scale-95"
          title={t('sidebar.expand')}
        >
          <PanelLeft size={18} />
        </button>
      </div>
    );
  }

  const renderModuleHeaderIcon = () => {
    if (activeModule === 'settings') {
      return <Settings size={20} className="text-brand-400" />;
    }
    const config = MODULE_CONFIG_MAP.get(activeModule);
    if (config) {
      const Icon = config.icon;
      return <Icon size={20} className="text-brand-400" />;
    }
    return <Home size={20} className="text-brand-400" />;
  };

  const renderModuleHeaderLabel = () => {
    const key = `sidebar.${activeModule}`;
    const translated = t(key);
    return translated !== key ? translated : activeModule;
  };

  return (
    <>
      <div 
         className="md:hidden fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm transition-opacity"
         onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
      />
      
      <div className="fixed md:relative z-[70] md:z-20 w-[260px] h-full bg-dark-bg md:bg-dark-card/50 border-r border-white/5 flex flex-col shadow-2xl md:shadow-none animate-slide-right md:animate-none">
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-white/5 select-none cursor-default" 
          data-tauri-drag-region
          onMouseDown={handleHeaderMouseDown}
          onDoubleClick={handleHeaderDoubleClick}
        >
          <div className="flex items-center gap-2" data-tauri-drag-region>
            {renderModuleHeaderIcon()}
            <span className="font-semibold text-sm">
              {renderModuleHeaderLabel()}
            </span>
          </div>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
            className="p-1.5 rounded-lg hover:bg-white/5 text-dark-subtext hover:text-dark-text transition-all active:scale-95"
            title={t('sidebar.collapse')}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>

        {activeModule === 'notes' ? (
          <SidebarPageTree 
            onCreatePage={onCreatePage} 
            onUpdatePage={onUpdatePage} 
            activeTab={activeTab} 
          />
        ) : activeModule === 'settings' ? (
          <div className="flex flex-col gap-1 mt-2 flex-1 overflow-y-auto custom-scrollbar pb-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider shrink-0">{t('sidebar.dashboard')}</div>
            
            {[
              { id: 'general', label: t('settings.tabs.general'), icon: Settings },
              { id: 'editor', label: t('settings.tabs.editor'), icon: LayoutDashboard },
              { id: 'security', label: t('settings.tabs.security'), icon: Shield },
              { id: 'ai', label: t('settings.tabs.ai'), icon: Zap },
              { id: 'shortcuts', label: t('settings.tabs.shortcuts'), icon: Keyboard },
              { id: 'storage', label: t('settings.tabs.storage'), icon: HardDrive },
              { id: 'video', label: t('settings.tabs.video'), icon: Video },
              { id: 'backup', label: t('settings.tabs.backup'), icon: DownloadCloud },
              { id: 'sync', label: t('settings.tabs.sync'), icon: RefreshCw },
              { id: 'sharing', label: t('settings.tabs.sharing'), icon: Share2 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => dispatch({ type: 'NAVIGATE_IN_TAB', pageId: tab.id })}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all mx-2 shrink-0 ${
                  (activeTab.pageId || 'general') === tab.id
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
                }`}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1 mt-2">
            <div className="px-3 py-2 text-xs text-dark-subtext uppercase tracking-wider">{renderModuleHeaderLabel()}</div>
            <div className="px-3 py-1 text-xs text-dark-subtext">{t(`sidebar.${activeModule}Desc`)}</div>
          </div>
        )}

        <div className="border-t border-white/5 flex flex-col mt-auto">
          <button
            onClick={() => setIsModulesExpanded(!isModulesExpanded)}
            className="flex items-center justify-between w-full p-3 text-xs font-semibold text-dark-subtext uppercase tracking-wider hover:bg-white/5 transition-colors group"
          >
            <span>{t('sidebar.modules')}</span>
            {isModulesExpanded ? (
              <ChevronDown size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            ) : (
              <ChevronUp size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
          
          {isModulesExpanded && (
            <div className="flex flex-col gap-1 px-3 pb-3 overflow-y-auto max-h-[40vh] custom-scrollbar">
              <SidebarModuleList 
                isCollapsedView={false} 
                onModuleSelect={() => {
                  if (window.innerWidth < 768) {
                    dispatch({ type: 'TOGGLE_SIDEBAR' });
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

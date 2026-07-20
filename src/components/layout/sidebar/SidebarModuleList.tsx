import { MAIN_MODULES, SPECIAL_MODULES } from './modules.config';
import type { ModuleConfig } from './modules.config';
import { useStore } from '../../../store/useStore';
import { Settings } from 'lucide-react';

interface SidebarModuleListProps {
  isCollapsedView?: boolean;
  onOpenSettings?: () => void;
  onModuleSelect?: () => void;
}

export function SidebarModuleList({ isCollapsedView, onOpenSettings, onModuleSelect }: SidebarModuleListProps) {
  const { state, dispatch } = useStore();
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0];
  const activeModule = activeTab?.module;

  const handleModuleClick = (moduleId: string) => {
    if (activeTab) {
      dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: moduleId });
    }
    if (onModuleSelect) {
      onModuleSelect();
    }
  };

  const renderModuleButton = (mod: ModuleConfig) => {
    const isActive = activeModule === mod.id;
    const Icon = mod.icon;
    
    if (isCollapsedView) {
      const activeClass = mod.color === 'red' 
        ? 'bg-red-500/20 text-red-400' 
        : 'bg-brand-500/20 text-brand-400';
      
      return (
        <button
          key={mod.id}
          onClick={() => handleModuleClick(mod.id)}
          className={`p-2 rounded-lg transition-all active:scale-95 ${
            isActive ? activeClass : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
          }`}
          title={mod.label}
        >
          <Icon size={18} />
        </button>
      );
    }

    const activeExpandedClass = mod.color === 'red'
      ? 'bg-red-500/20 text-red-400'
      : 'bg-brand-500/10 text-brand-400';

    return (
      <button
        key={mod.id}
        onClick={() => handleModuleClick(mod.id)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
          mod.isSpecial ? 'mt-2' : ''
        } ${
          isActive
            ? activeExpandedClass
            : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
        }`}
      >
        <Icon size={16} />
        <span>{mod.label}</span>
      </button>
    );
  };

  return (
    <>
      {MAIN_MODULES.map(renderModuleButton)}
      {SPECIAL_MODULES.map(renderModuleButton)}
      
      {/* Settings Button */}
      {isCollapsedView ? (
        <button
          onClick={() => handleModuleClick('settings')}
          className={`p-2 rounded-lg transition-all active:scale-95 mt-auto ${
            activeModule === 'settings' ? 'bg-brand-500/20 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
          }`}
          title="Configurações"
        >
          <Settings size={18} />
        </button>
      ) : (
        <button
          onClick={() => handleModuleClick('settings')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all mt-2 ${
            activeModule === 'settings' ? 'bg-brand-500/10 text-brand-400' : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
          }`}
        >
          <Settings size={16} />
          <span>Configurações</span>
        </button>
      )}
    </>
  );
}

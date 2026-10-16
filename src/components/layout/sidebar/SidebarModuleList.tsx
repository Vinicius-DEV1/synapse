import { MAIN_MODULES, SPECIAL_MODULES } from './modules.config';
import type { ModuleConfig } from './modules.config';
import { useStore } from '../../../store/useStore';
import type { Action, Tab } from '../../../types';
import { Settings } from 'lucide-react';
import { useI18n } from '../../../i18n';

interface SidebarModuleListProps {
  isCollapsedView?: boolean;
  onModuleSelect?: () => void;
}

// UI navigates to 'home', 'trash', and 'settings' as tabs,
// extending Tab['module'] for navigation.
type ModuleId = Tab['module'] | 'settings';

export function SidebarModuleList({ isCollapsedView, onModuleSelect }: SidebarModuleListProps) {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const activeTab = state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0];
  const activeModule = activeTab?.module as ModuleId | undefined;

  const handleModuleClick = (moduleId: ModuleId) => {
    if (activeTab) {
      dispatch({ type: 'UPDATE_TAB_MODULE', tabId: activeTab.id, module: moduleId } as Extract<Action, { type: 'UPDATE_TAB_MODULE' }>);
    }
    if (onModuleSelect) {
      onModuleSelect();
    }
  };

  const getModuleLabel = (mod: ModuleConfig): string => {
    const key = `sidebar.${mod.id}`;
    const translated = t(key);
    return translated !== key ? translated : mod.label;
  };

  const renderModuleButton = (mod: ModuleConfig) => {
    const isActive = activeModule === mod.id;
    const Icon = mod.icon;
    const label = getModuleLabel(mod);

    if (isCollapsedView) {
      const activeClass = mod.color === 'red'
        ? 'bg-red-500/20 text-red-400'
        : 'bg-brand-500/20 text-brand-400';

      return (
        <button
          key={mod.id}
          onClick={() => handleModuleClick(mod.id as ModuleId)}
          className={`p-2 rounded-lg transition-all active:scale-95 ${
            isActive ? activeClass : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
          }`}
          title={label}
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
        onClick={() => handleModuleClick(mod.id as ModuleId)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
          mod.isSpecial ? 'mt-2' : ''
        } ${
          isActive
            ? activeExpandedClass
            : 'text-dark-subtext hover:text-dark-text hover:bg-white/5'
        }`}
      >
        <Icon size={16} />
        <span>{label}</span>
      </button>
    );
  };

  const settingsLabel = t('sidebar.settings');

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
          title={settingsLabel}
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
          <span>{settingsLabel}</span>
        </button>
      )}
    </>
  );
}

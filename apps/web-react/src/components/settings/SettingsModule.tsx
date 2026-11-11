import React, { useState, useEffect } from 'react';
import { Settings, Save, Shield, Layout, Zap, Keyboard, HardDrive, DownloadCloud, RefreshCw, Video, Share2 } from 'lucide-react';
import { getSettings, saveSettings } from '../../utils/settings';
import type { AppSettings } from '../../utils/settings';

import GeneralTab from './tabs/GeneralTab';
import EditorTab from './tabs/EditorTab';
import SecurityTab from './tabs/SecurityTab';
import AiTab from './tabs/AiTab';
import ShortcutsTab from './tabs/ShortcutsTab';
import StorageTab from './tabs/StorageTab';
import VideoTab from './tabs/VideoTab';
import { BackupTab } from './tabs/BackupTab';
import SyncMonitor from './SyncMonitor';
import { SharingTab } from './tabs/SharingTab';
import type { Tab } from '../../types';
import { useI18n } from '../../i18n';

export default function SettingsModule({ tab }: { tab?: Tab }) {
  const { t } = useI18n();
  const activeTab = tab?.pageId || 'general';
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings());
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const handleSettingsChange = () => {
      setAppSettings(getSettings());
    };
    window.addEventListener('app-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('app-settings-changed', handleSettingsChange);
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(appSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const tabs = [
    { id: 'general', label: t('settings.tabs.general'), icon: Settings },
    { id: 'editor', label: t('settings.tabs.editor'), icon: Layout },
    { id: 'security', label: t('settings.tabs.security'), icon: Shield },
    { id: 'ai', label: t('settings.tabs.ai'), icon: Zap },
    { id: 'shortcuts', label: t('settings.tabs.shortcuts'), icon: Keyboard },
    { id: 'storage', label: t('settings.tabs.storage'), icon: HardDrive },
    { id: 'video', label: t('settings.tabs.video'), icon: Video },
    { id: 'backup', label: t('settings.tabs.backup'), icon: DownloadCloud },
    { id: 'sync', label: t('settings.tabs.sync'), icon: RefreshCw },
    { id: 'sharing', label: t('settings.tabs.sharing'), icon: Share2 },
  ] as const;

  const showSaveButton = !isChangingPassword && ['general', 'editor', 'security', 'ai'].includes(activeTab);
  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="w-full h-full flex bg-dark-bg text-dark-text overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-y-auto bg-dark-bg p-4 sm:p-6 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{currentTab?.label}</h1>
            <p className="text-dark-subtext text-sm sm:text-base">
              {t('settings.subtitle', { category: (currentTab?.label ?? '').toLowerCase() })}
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="bg-dark-card border border-white/5 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
            {activeTab === 'general' && !isChangingPassword && (
              <GeneralTab appSettings={appSettings} setAppSettings={setAppSettings} />
            )}

            {activeTab === 'editor' && !isChangingPassword && (
              <EditorTab appSettings={appSettings} setAppSettings={setAppSettings} />
            )}

            {activeTab === 'security' && (
              <SecurityTab 
                appSettings={appSettings} 
                setAppSettings={setAppSettings} 
                isChangingPassword={isChangingPassword}
                setIsChangingPassword={setIsChangingPassword}
              />
            )}

            {activeTab === 'ai' && !isChangingPassword && (
              <AiTab appSettings={appSettings} setAppSettings={setAppSettings} />
            )}

            {activeTab === 'shortcuts' && !isChangingPassword && (
              <ShortcutsTab />
            )}

            {activeTab === 'storage' && !isChangingPassword && (
              <StorageTab />
            )}

            {activeTab === 'video' && !isChangingPassword && (
              <VideoTab />
            )}

            {activeTab === 'backup' && !isChangingPassword && (
              <BackupTab />
            )}

            {activeTab === 'sync' && !isChangingPassword && (
              <SyncMonitor />
            )}

            {activeTab === 'sharing' && !isChangingPassword && (
              <SharingTab />
            )}

            {showSaveButton && (
              <div className="pt-8 mt-8 border-t border-white/5 flex items-center justify-end gap-4">
                {saveSuccess && (
                  <span className="text-green-400 text-sm animate-fade-in flex items-center gap-1">
                    <Save size={14} /> {t('settings.savedSuccess')}
                  </span>
                )}
                <button
                  type="submit"
                  className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-8 py-2.5 rounded-xl transition-all flex items-center gap-2"
                >
                  <Save size={16} />
                  {t('settings.saveButton')}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

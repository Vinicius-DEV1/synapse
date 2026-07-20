import React, { useState } from 'react';
import { Settings, Save, Shield, Layout, Zap, Keyboard, HardDrive, DownloadCloud, RefreshCw } from 'lucide-react';
import { getSettings, saveSettings } from '../../utils/settings';
import type { AppSettings } from '../../utils/settings';

import GeneralTab from './tabs/GeneralTab';
import EditorTab from './tabs/EditorTab';
import SecurityTab from './tabs/SecurityTab';
import AiTab from './tabs/AiTab';
import ShortcutsTab from './tabs/ShortcutsTab';
import StorageTab from './tabs/StorageTab';
import { BackupTab } from './tabs/BackupTab';
import SyncMonitor from './SyncMonitor';

export default function SettingsModule() {
  const [activeTab, setActiveTab] = useState<'general' | 'editor' | 'security' | 'ai' | 'shortcuts' | 'storage' | 'backup' | 'sync'>('general');
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings());
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(appSettings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const tabs = [
    { id: 'general', label: 'Geral', icon: Settings },
    { id: 'editor', label: 'Editor', icon: Layout },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'ai', label: 'IA', icon: Zap },
    { id: 'shortcuts', label: 'Atalhos', icon: Keyboard },
    { id: 'storage', label: 'Uso', icon: HardDrive },
    { id: 'backup', label: 'Backup', icon: DownloadCloud },
    { id: 'sync', label: 'Sync', icon: RefreshCw },
  ] as const;

  const showSaveButton = !isChangingPassword && ['general', 'editor', 'security', 'ai'].includes(activeTab);

  return (
    <div className="w-full h-full flex bg-dark-bg text-dark-text overflow-hidden">
      {/* Sidebar for settings tabs */}
      <div className="w-64 border-r border-white/5 bg-dark-card/30 flex flex-col h-full overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-brand-500/20 rounded-xl flex items-center justify-center text-brand-400 shadow-inner">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-tight">Configurações</h2>
              <p className="text-xs text-dark-subtext">Painel de Controle</p>
            </div>
          </div>
        </div>

        <div className="flex-1 px-3 pb-6 flex flex-col gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setIsChangingPassword(false);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                  isActive 
                    ? 'bg-brand-500/10 text-brand-400' 
                    : 'text-dark-subtext hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-y-auto bg-dark-bg p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto">
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">{tabs.find(t => t.id === activeTab)?.label}</h1>
            <p className="text-dark-subtext">Gerencie suas preferências de {tabs.find(t => t.id === activeTab)?.label.toLowerCase()}.</p>
          </div>

          <form onSubmit={handleSaveSettings} className="bg-dark-card border border-white/5 rounded-2xl p-8 shadow-xl">
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

            {activeTab === 'backup' && !isChangingPassword && (
              <BackupTab />
            )}

            {activeTab === 'sync' && !isChangingPassword && (
              <SyncMonitor />
            )}

            {showSaveButton && (
              <div className="pt-8 mt-8 border-t border-white/5 flex items-center justify-end gap-4">
                {saveSuccess && (
                  <span className="text-green-400 text-sm animate-fade-in flex items-center gap-1">
                    <Save size={14} /> Salvo com sucesso!
                  </span>
                )}
                <button
                  type="submit"
                  className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-8 py-2.5 rounded-xl transition-all flex items-center gap-2"
                >
                  <Save size={16} />
                  Salvar Alterações
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

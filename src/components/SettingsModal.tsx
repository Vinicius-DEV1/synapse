import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, Save } from 'lucide-react';
import { getSettings, saveSettings } from '../utils/settings';
import type { AppSettings } from '../utils/settings';

import GeneralTab from './settings/tabs/GeneralTab';
import EditorTab from './settings/tabs/EditorTab';
import SecurityTab from './settings/tabs/SecurityTab';
import AiTab from './settings/tabs/AiTab';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'editor' | 'security' | 'ai'>('general');
  const [appSettings, setAppSettings] = useState<AppSettings>(getSettings());
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(appSettings);
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-dark-card border border-white/10 rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-subtext hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4 border-b border-white/5 pb-4">
          <div className="w-10 h-10 bg-brand-500/20 rounded-xl flex items-center justify-center text-brand-400">
            <Settings size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">Configurações</h2>
            <p className="text-xs text-dark-subtext">Segurança e Personalização</p>
          </div>
        </div>

        {/* Tabs Navigation */}
        {!isChangingPassword && (
          <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('general')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'general' ? 'bg-dark-card text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}
            >
              Geral
            </button>
            <button 
              onClick={() => setActiveTab('editor')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'editor' ? 'bg-dark-card text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}
            >
              Editor
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'security' ? 'bg-dark-card text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}
            >
              Segurança
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'ai' ? 'bg-dark-card text-white shadow-sm' : 'text-dark-subtext hover:text-white'}`}
            >
              IA
            </button>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSaveSettings}>
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

          {!isChangingPassword && (
            <div className="pt-6">
              <button
                type="submit"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Save size={16} />
                Salvar Configurações
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

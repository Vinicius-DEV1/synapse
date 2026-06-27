import React from 'react';
import type { AppSettings } from '../../../utils/settings';

interface EditorTabProps {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
}

export default function EditorTab({ appSettings, setAppSettings }: EditorTabProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-white mb-2">Tamanho da Fonte</label>
        <select 
          value={appSettings.fontSize}
          onChange={(e) => setAppSettings({ ...appSettings, fontSize: e.target.value as any })}
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
        >
          <option value="text-sm">Pequeno (14px)</option>
          <option value="text-base">Padrão (16px)</option>
          <option value="text-lg">Grande (18px)</option>
        </select>
      </div>
      
      <label className="flex items-center justify-between cursor-pointer group">
        <div>
          <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
            Corretor Ortográfico
          </span>
          <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
            Sublinha palavras incorretas no texto.
          </span>
        </div>
        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
          <input 
            type="checkbox" 
            checked={appSettings.spellcheck}
            onChange={(e) => setAppSettings({ ...appSettings, spellcheck: e.target.checked })}
            className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
          />
          <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.spellcheck ? 'bg-brand-500' : 'bg-white/20'}`}></label>
        </div>
      </label>
    </div>
  );
}

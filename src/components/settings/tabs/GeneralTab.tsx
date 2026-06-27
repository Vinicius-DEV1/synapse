import React from 'react';
import type { AppSettings } from '../../../utils/settings';

interface GeneralTabProps {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
}

export default function GeneralTab({ appSettings, setAppSettings }: GeneralTabProps) {
  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between cursor-pointer group">
        <div>
          <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
            Salvar estado das abas
          </span>
          <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
            Restaura as abas abertas da última sessão.
          </span>
        </div>
        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
          <input 
            type="checkbox" 
            checked={appSettings.restoreTabsOnStartup}
            onChange={(e) => setAppSettings({ ...appSettings, restoreTabsOnStartup: e.target.checked })}
            className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
          />
          <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.restoreTabsOnStartup ? 'bg-brand-500' : 'bg-white/20'}`}></label>
        </div>
      </label>
    </div>
  );
}

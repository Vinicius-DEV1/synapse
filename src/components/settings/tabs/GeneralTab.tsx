import React from 'react';
import { Globe, Check } from 'lucide-react';
import type { AppSettings } from '../../../utils/settings';
import { triggerToast } from '../../ui/ToastContext';
import { useI18n, SUPPORTED_LANGUAGES } from '../../../i18n';

interface GeneralTabProps {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
}

export default function GeneralTab({ appSettings, setAppSettings }: GeneralTabProps) {
  const { t, setLanguage } = useI18n();
  const [videoPath, setVideoPath] = React.useState<string>('Padrão do Sistema (AppData)');
  
  React.useEffect(() => {
    if (window.api?.config) {
      window.api.config.get('videoStoragePath').then((path: unknown) => {
        if (typeof path === 'string') {
          setVideoPath(path);
        }
      }).catch(console.error);
    }
  }, []);

  const handleSelectFolder = async () => {
    if (!window.api?.video?.openFolderDialog) {
      triggerToast(t('common.featureNotAvailable') || 'Recurso não disponível nesta versão.', 'info');
      return;
    }
    try {
      const newPath = await window.api.video.openFolderDialog();
      if (newPath) {
        setVideoPath(newPath);
        window.api.config?.set('videoStoragePath', newPath);
        triggerToast('Pasta de vídeos atualizada!', 'success');
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Erro ao alterar pasta de vídeos';
      triggerToast(message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div className="border-b border-white/10 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} className="text-brand-400" />
          <h4 className="text-sm font-medium text-white">{t('settings.language.title')}</h4>
        </div>
        <p className="text-xs text-dark-subtext mb-3">
          {t('settings.language.description')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = (appSettings.language || 'en') === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setAppSettings({ ...appSettings, language: lang.code });
                  setLanguage(lang.code);
                }}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'bg-brand-500/10 border-brand-500 text-white shadow-sm ring-1 ring-brand-500/30'
                    : 'bg-black/20 border-white/5 hover:border-white/15 text-white/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${
                      isSelected ? 'bg-brand-500 text-white' : 'bg-white/5 text-white/60'
                    }`}
                  >
                    {lang.code === 'en' ? 'EN' : 'PT'}
                  </div>
                  <div>
                    <span className="block text-sm font-medium">{lang.nativeLabel}</span>
                    <span className="block text-xs text-dark-subtext">{lang.label}</span>
                  </div>
                </div>
                {isSelected && (
                  <div className="flex items-center gap-1.5 text-brand-400">
                    <Check size={16} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab System */}
      <div className="border-b border-white/10 pb-4">
        <h4 className="text-sm font-medium text-white mb-3">{t('settings.general.tabSystem')}</h4>
        
        <label className="flex items-center justify-between cursor-pointer group mb-4">
          <div>
            <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
              {t('settings.general.tabsWeb')}
            </span>
            <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
              {t('settings.general.tabsWebDesc')}
            </span>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
            <input 
              type="checkbox" 
              checked={appSettings.enableTabsWeb}
              onChange={(e) => setAppSettings({ ...appSettings, enableTabsWeb: e.target.checked })}
              className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
            />
            <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.enableTabsWeb ? 'bg-brand-500' : 'bg-white/20'}`}></label>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer group">
          <div>
            <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
              {t('settings.general.tabsDesktop')}
            </span>
            <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
              {t('settings.general.tabsDesktopDesc')}
            </span>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
            <input 
              type="checkbox" 
              checked={appSettings.enableTabsDesktop}
              onChange={(e) => setAppSettings({ ...appSettings, enableTabsDesktop: e.target.checked })}
              className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
            />
            <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.enableTabsDesktop ? 'bg-brand-500' : 'bg-white/20'}`}></label>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer group mt-4">
          <div>
            <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
              {t('settings.general.hidePinnedNames')}
            </span>
            <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
              {t('settings.general.hidePinnedNamesDesc')}
            </span>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
            <input 
              type="checkbox" 
              checked={appSettings.compactPinnedTabs}
              onChange={(e) => setAppSettings({ ...appSettings, compactPinnedTabs: e.target.checked })}
              className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
            />
            <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.compactPinnedTabs ? 'bg-brand-500' : 'bg-white/20'}`}></label>
          </div>
        </label>

        <div className="flex items-center justify-between group pt-4">
          <div>
            <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
              {t('settings.general.tabMaxWidth')}
            </span>
            <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
              {t('settings.general.tabMaxWidthDesc')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="140"
              max="800"
              step="20"
              value={appSettings.tabMaxWidth ?? 400}
              onChange={(e) => setAppSettings({ ...appSettings, tabMaxWidth: parseInt(e.target.value, 10) })}
              className="w-28 accent-brand-500 cursor-pointer"
            />
            <span className="text-xs font-mono px-2 py-1 bg-dark-bg border border-white/10 rounded text-brand-400 min-w-[58px] text-center">
              {appSettings.tabMaxWidth ?? 400}px
            </span>
          </div>
        </div>
      </div>

      <label className="flex items-center justify-between cursor-pointer group">
        <div>
          <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
            {t('settings.general.restoreTabs')}
          </span>
          <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
            {t('settings.general.restoreTabsDesc')}
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

      {/* Studies (Anki) */}
      <div className="border-t border-white/10 pt-4 mb-4">
        <h4 className="text-sm font-medium text-white mb-3">{t('settings.general.studyAnki')}</h4>
        
        <label className="flex items-center justify-between cursor-pointer group mb-4">
          <div>
            <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
              {t('settings.general.enable3DFlip')}
            </span>
            <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
              {t('settings.general.enable3DFlipDesc')}
            </span>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
            <input 
              type="checkbox" 
              checked={appSettings.enableStudy3DFlip ?? true}
              onChange={(e) => setAppSettings({ ...appSettings, enableStudy3DFlip: e.target.checked })}
              className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
            />
            <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.enableStudy3DFlip ?? true ? 'bg-brand-500' : 'bg-white/20'}`}></label>
          </div>
        </label>

        <label className="flex items-center justify-between cursor-pointer group mb-4">
          <div>
            <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
              {t('settings.general.enableSfx')}
            </span>
            <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
              {t('settings.general.enableSfxDesc')}
            </span>
          </div>
          <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
            <input 
              type="checkbox" 
              checked={appSettings.enableStudySfx ?? true}
              onChange={(e) => setAppSettings({ ...appSettings, enableStudySfx: e.target.checked })}
              className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
            />
            <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.enableStudySfx ?? true ? 'bg-brand-500' : 'bg-white/20'}`}></label>
          </div>
        </label>
      </div>

      {/* Local Storage */}
      <div className="border-t border-white/10 pt-4">
        <h4 className="text-sm font-medium text-white mb-3">{t('settings.general.localStorage')}</h4>
        <div className="bg-black/20 border border-white/5 rounded-xl p-3">
          <label className="block text-xs font-medium text-dark-subtext mb-1">{t('settings.general.videoDownloadFolder')}</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/5 border border-white/10 text-white/80 text-xs px-3 py-2 rounded-lg font-mono truncate cursor-not-allowed">
              {videoPath}
            </div>
            <button
              type="button"
              onClick={handleSelectFolder}
              className="px-3 py-2 bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              {t('settings.general.changeFolder')}
            </button>
          </div>
          <p className="text-[10px] text-white/40 mt-2">
            {t('settings.general.videoFolderNotice')}
          </p>
        </div>
      </div>

      {/* External Modules */}
      <div className="border-t border-white/10 pt-4">
        <h4 className="text-sm font-medium text-white mb-3">{t('settings.general.externalModules')}</h4>
        <div className="bg-black/20 border border-white/5 rounded-xl p-3 flex justify-between items-center">
          <div>
            <label className="block text-xs font-medium text-dark-subtext mb-1">{t('settings.general.focusModule')}</label>
            <p className="text-[10px] text-white/40">
              {t('settings.general.focusModuleDesc')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.api?.app?.openFocusWindow?.()}
            className="px-3 py-2 bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {t('settings.general.openFocus')}
          </button>
        </div>
      </div>
    </div>
  );
}

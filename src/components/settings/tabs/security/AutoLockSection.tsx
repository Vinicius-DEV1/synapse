import type { AppSettings } from '../../../../utils/settings';
import { useI18n } from '../../../../i18n';

interface AutoLockSectionProps {
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
}

export function AutoLockSection({ appSettings, setAppSettings }: AutoLockSectionProps) {
  const { t } = useI18n();

  return (
    <>
      <label className="flex items-center justify-between cursor-pointer group">
        <div>
          <span className="block text-sm font-medium text-white group-hover:text-brand-400 transition-colors">
            {t('settings.security.lockOnSuspend')}
          </span>
          <span className="block text-xs text-dark-subtext mt-0.5 pr-4">
            {t('settings.security.lockOnSuspendDesc')}
          </span>
        </div>
        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
          <input 
            type="checkbox" 
            checked={appSettings.autoLockOnSuspend}
            onChange={(e) => setAppSettings({ ...appSettings, autoLockOnSuspend: e.target.checked })}
            className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 border-dark-card appearance-none cursor-pointer checked:right-0 checked:border-brand-500 transition-all duration-200"
          />
          <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer transition-colors duration-200 ${appSettings.autoLockOnSuspend ? 'bg-brand-500' : 'bg-white/20'}`}></label>
        </div>
      </label>

      <div className="border-t border-white/5 pt-4">
        <label className="block text-sm font-medium text-white mb-2">{t('settings.security.autoLockTitle')}</label>
        <select 
          value={appSettings.inactivityTimeoutMinutes}
          onChange={(e) => setAppSettings({ ...appSettings, inactivityTimeoutMinutes: parseInt(e.target.value, 10) })}
          className="w-full bg-dark-bg border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors cursor-pointer"
        >
          <option className="bg-dark-bg text-white" value="0">{t('settings.security.never')}</option>
          <option className="bg-dark-bg text-white" value="5">{t('settings.security.minutes', { count: 5 })}</option>
          <option className="bg-dark-bg text-white" value="15">{t('settings.security.minutes', { count: 15 })}</option>
          <option className="bg-dark-bg text-white" value="30">{t('settings.security.minutes', { count: 30 })}</option>
          <option className="bg-dark-bg text-white" value="60">{t('settings.security.oneHour')}</option>
        </select>
        <p className="text-[11px] text-dark-subtext mt-1.5">
          {t('settings.security.autoLockDesc')}
        </p>
      </div>
    </>
  );
}

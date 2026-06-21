export interface AppSettings {
  autoLockOnSuspend: boolean;
  inactivityTimeoutMinutes: number; // 0 = disabled
  restoreTabsOnStartup: boolean;
  fontSize: 'text-sm' | 'text-base' | 'text-lg';
  spellcheck: boolean;
}

export function getSettings(): AppSettings {
  const defaultSettings: AppSettings = {
    autoLockOnSuspend: true,
    inactivityTimeoutMinutes: 60,
    restoreTabsOnStartup: true,
    fontSize: 'text-base',
    spellcheck: true
  };
  
  try {
    const s = localStorage.getItem('appSettings');
    if (s) {
      return { ...defaultSettings, ...JSON.parse(s) };
    }
  } catch (err) {
    console.error('Failed to parse settings', err);
  }
  return defaultSettings;
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem('appSettings', JSON.stringify(s));
  window.dispatchEvent(new Event('app-settings-changed'));
  if (window.api?.auth) {
    window.api.auth.setPreferences({ autoLockOnSuspend: s.autoLockOnSuspend });
  }
}

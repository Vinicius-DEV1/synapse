export interface AppSettings {
  autoLockOnSuspend: boolean;
  inactivityTimeoutMinutes: number; // 0 = disabled
  restoreTabsOnStartup: boolean;
  fontSize: 'text-sm' | 'text-base' | 'text-lg';
  spellcheck: boolean;
  geminiModel: string;
  aiChatHighlight: 'glow' | 'underline' | 'none';
  dictionaryMode: 'offline' | 'online';
  hasOfflineDictionary: boolean;
  defaultReadingMode: 'light' | 'sepia' | 'mint' | 'dim' | 'nord' | 'midnight' | 'dark' | 'high-contrast';
}

export function getSettings(): AppSettings {
  const defaultSettings: AppSettings = {
    autoLockOnSuspend: true,
    inactivityTimeoutMinutes: 60,
    restoreTabsOnStartup: true,
    fontSize: 'text-base',
    spellcheck: true,
    geminiModel: 'gemini-1.5-pro',
    aiChatHighlight: 'glow',
    dictionaryMode: 'offline',
    hasOfflineDictionary: false,
    defaultReadingMode: 'light'
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

  // Backup to DB for sync across incognito sessions
  if (window.api?.config) {
    window.api.config.set('appSettings', s).catch(err => {
      console.error('Failed to sync settings to DB:', err);
    });
  }
}

/**
 * Puxa as configurações do banco de dados (que vieram da nuvem) e sobrescreve local.
 * Útil para aplicar as preferências logo após um login no modo anônimo.
 */
export async function syncSettingsFromDb() {
  if (!window.api?.config) return;
  
  try {
    const s = await window.api.config.get('appSettings');
    if (s && typeof s === 'object') {
      const current = getSettings();
      // Mescla com os padrões para evitar crash caso faltem campos
      const merged = { ...current, ...s };
      localStorage.setItem('appSettings', JSON.stringify(merged));
      window.dispatchEvent(new Event('app-settings-changed'));
    }
  } catch (err) {
    console.error('Failed to load settings from DB:', err);
  }
}

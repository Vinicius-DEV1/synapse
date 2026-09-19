export interface AppSettings {
  autoLockOnSuspend: boolean;
  inactivityTimeoutMinutes: number; // 0 = disabled
  restoreTabsOnStartup: boolean;
  enableTabsWeb: boolean; // Enable/disable tab system on web
  enableTabsDesktop: boolean; // Enable/disable tab system on desktop
  fontSize: 'text-sm' | 'text-base' | 'text-lg';
  spellcheck: boolean;
  geminiModel: string;
  geminiModelChat?: string;
  geminiModelFlashcards?: string;
  geminiModelDictionary?: string;
  /** Whether to run a 2nd AI review pass to validate facts and eliminate hallucinations during question generation */
  quizDualAiValidation?: boolean;
  /** Specific model for generating quiz questions (IA 1). Falls back to geminiModelChat or geminiModel */
  geminiModelQuizGenerator?: string;
  /** Specific model for validating quiz questions (IA 2). Falls back to geminiModelChat or geminiModel */
  geminiModelQuizValidator?: string;
  aiChatHighlight: 'glow' | 'underline' | 'none';
  dictionaryMode: 'offline' | 'online';
  hasOfflineDictionary: boolean;
  defaultReadingMode: 'light' | 'sepia' | 'mint' | 'dim' | 'nord' | 'midnight' | 'dark' | 'high-contrast';
  defaultTextWidth: 'narrow' | 'medium' | 'full';
  aiDictionaryLanguage: 'bilingual' | 'english_only';
  enableStudySfx: boolean;
  enableStudy3DFlip: boolean;
  videoConversionPreset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  videoPlaybackPreference: 'auto' | 'force_original' | 'force_web';
  videoDefaultWebQuality: 'original' | 'remux' | '1080p' | '720p' | '480p' | '360p';
  /** Auto-lock vault after N minutes of inactivity (0 = disabled) */
  autoLockMinutes?: number;
  compactPinnedTabs?: boolean;
  /** Maximum width in px for unpinned tabs (default: 400) */
  tabMaxWidth?: number;
}

export function getSettings(): AppSettings {
  const defaultSettings: AppSettings = {
    autoLockOnSuspend: true,
    inactivityTimeoutMinutes: 60,
    restoreTabsOnStartup: true,
    enableTabsWeb: true,
    enableTabsDesktop: true,
    fontSize: 'text-base',
    spellcheck: true,
    geminiModel: 'gemini-2.5-pro',
    quizDualAiValidation: true,
    geminiModelQuizGenerator: '',
    geminiModelQuizValidator: '',
    aiChatHighlight: 'glow',
    dictionaryMode: 'offline',
    hasOfflineDictionary: false,
    defaultReadingMode: 'light',
    defaultTextWidth: 'medium',
    aiDictionaryLanguage: 'bilingual',
    enableStudySfx: true,
    enableStudy3DFlip: true,
    videoConversionPreset: 'medium',
    videoPlaybackPreference: 'auto',
    videoDefaultWebQuality: '720p',
    compactPinnedTabs: true,
    tabMaxWidth: 400
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
 * Fetches settings from database (synced from cloud) and updates local state.
 * Useful to apply user preferences immediately after logging in.
 */
export async function syncSettingsFromDb() {
  if (!window.api?.config) return;
  
  try {
    const s = await window.api.config.get('appSettings');
    if (s && typeof s === 'object') {
      const current = getSettings();
      // Merge with defaults to prevent crashes if fields are missing
      const merged = { ...current, ...s };
      localStorage.setItem('appSettings', JSON.stringify(merged));
      window.dispatchEvent(new Event('app-settings-changed'));
    }
  } catch (err) {
    console.error('Failed to load settings from DB:', err);
  }
}

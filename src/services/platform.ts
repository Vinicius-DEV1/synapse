export interface PlatformCapabilities {
  platform: 'web' | 'desktop';
  canReadLocalFilesystem: boolean;
  useNativeTitleBar: boolean;
  supportsNativeTabs: boolean;
}

// The single location in the application where Tauri environment variable is injected
const isDesktop = typeof window !== 'undefined' && (!!window.__TAURI_INTERNALS__ || !!(window as any).__TAURI_IPC__);

export const platform: PlatformCapabilities = {
  platform: isDesktop ? 'desktop' : 'web',
  canReadLocalFilesystem: isDesktop,
  useNativeTitleBar: isDesktop,
  supportsNativeTabs: isDesktop
};

export function isDesktopApp(): boolean {
  return platform.canReadLocalFilesystem || (typeof window !== 'undefined' && !!window.api);
}

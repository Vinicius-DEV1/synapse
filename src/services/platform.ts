export interface PlatformCapabilities {
  platform: 'web' | 'desktop';
  canReadLocalFilesystem: boolean;
  useNativeTitleBar: boolean;
  supportsNativeTabs: boolean;
}

// O único lugar de toda a aplicação onde injetamos a variável de ambiente do Tauri
const isDesktop = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

export const platform: PlatformCapabilities = {
  platform: isDesktop ? 'desktop' : 'web',
  canReadLocalFilesystem: isDesktop,
  useNativeTitleBar: isDesktop,
  supportsNativeTabs: isDesktop
};

export interface PlatformCapabilities {
  platform: 'web' | 'desktop' | 'mobile-webview';
  canReadLocalFilesystem: boolean;
  useNativeTitleBar: boolean;
  supportsNativeTabs: boolean;
}

// The single location in the application where runtime environment variable is injected
const isDesktop = typeof window !== 'undefined' && (!!window.__TAURI_INTERNALS__ || !!(window as any).__TAURI_IPC__);
const isMobileWebViewEnv = typeof window !== 'undefined' && (!!(window as any).__CADERNO_MOBILE_WEBVIEW__ || !!(window as any).ReactNativeWebView);

export const platform: PlatformCapabilities = {
  platform: isDesktop ? 'desktop' : (isMobileWebViewEnv ? 'mobile-webview' : 'web'),
  canReadLocalFilesystem: isDesktop || isMobileWebViewEnv,
  useNativeTitleBar: isDesktop,
  supportsNativeTabs: isDesktop
};

export function isDesktopApp(): boolean {
  return platform.canReadLocalFilesystem || (typeof window !== 'undefined' && !!window.api);
}

export function isMobileWebView(): boolean {
  return typeof window !== 'undefined' && (!!(window as any).__CADERNO_MOBILE_WEBVIEW__ || !!(window as any).ReactNativeWebView);
}


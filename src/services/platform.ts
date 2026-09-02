import { isTauri } from '@tauri-apps/api/core';

export interface PlatformCapabilities {
  platform: 'web' | 'desktop' | 'mobile-webview';
  canReadLocalFilesystem: boolean;
  useNativeTitleBar: boolean;
  supportsNativeTabs: boolean;
}

function checkIsDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return isTauri() || !!(window as any).isTauri || !!window.__TAURI_INTERNALS__ || !!(window as any).__TAURI__ || !!(window as any).__TAURI_IPC__;
  } catch {
    return !!(window as any).isTauri || !!window.__TAURI_INTERNALS__ || !!(window as any).__TAURI__ || !!(window as any).__TAURI_IPC__;
  }
}

function checkIsMobileWebView(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).__CADERNO_MOBILE_WEBVIEW__ || !!(window as any).ReactNativeWebView;
}

export const platform: PlatformCapabilities = {
  get platform() {
    return checkIsDesktop() ? 'desktop' : (checkIsMobileWebView() ? 'mobile-webview' : 'web');
  },
  get canReadLocalFilesystem() {
    return checkIsDesktop() || checkIsMobileWebView();
  },
  get useNativeTitleBar() {
    return checkIsDesktop();
  },
  get supportsNativeTabs() {
    return checkIsDesktop();
  }
};

export function isDesktopApp(): boolean {
  return checkIsDesktop() || (typeof window !== 'undefined' && !!window.api);
}

export function isMobileWebView(): boolean {
  return checkIsMobileWebView();
}


import { isTauri } from '@tauri-apps/api/core';

declare global {
  interface Window {
    isTauri?: boolean;
    __TAURI_INTERNALS__?: unknown;
    __TAURI__?: unknown;
    __TAURI_IPC__?: unknown;
    __CADERNO_MOBILE_WEBVIEW__?: boolean;
    ReactNativeWebView?: unknown;
  }
}

export interface PlatformCapabilities {
  platform: 'web' | 'desktop' | 'mobile-webview';
  canReadLocalFilesystem: boolean;
  useNativeTitleBar: boolean;
  supportsNativeTabs: boolean;
}

function checkIsDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      isTauri() ||
      !!window.isTauri ||
      !!window.__TAURI_INTERNALS__ ||
      !!window.__TAURI__ ||
      !!window.__TAURI_IPC__
    );
  } catch {
    return (
      !!window.isTauri ||
      !!window.__TAURI_INTERNALS__ ||
      !!window.__TAURI__ ||
      !!window.__TAURI_IPC__
    );
  }
}

function checkIsMobileWebView(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.__CADERNO_MOBILE_WEBVIEW__ || !!window.ReactNativeWebView;
}

export const platform: PlatformCapabilities = {
  get platform() {
    return checkIsDesktop() ? 'desktop' : checkIsMobileWebView() ? 'mobile-webview' : 'web';
  },
  get canReadLocalFilesystem() {
    return checkIsDesktop() || checkIsMobileWebView();
  },
  get useNativeTitleBar() {
    return checkIsDesktop();
  },
  get supportsNativeTabs() {
    return checkIsDesktop();
  },
};

export function isDesktopApp(): boolean {
  return checkIsDesktop() || (typeof window !== 'undefined' && !!window.api);
}

export function isMobileWebView(): boolean {
  return checkIsMobileWebView();
}

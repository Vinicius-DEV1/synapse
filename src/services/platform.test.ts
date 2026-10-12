import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { platform, isDesktopApp, isMobileWebView } from './platform';

describe('platform capabilities', () => {
  beforeEach(() => {
    delete (window as any).isTauri;
    delete (window as any).__TAURI__;
    delete (window as any).__TAURI_INTERNALS__;
    delete (window as any).__TAURI_IPC__;
    delete (window as any).__CADERNO_MOBILE_WEBVIEW__;
    delete (window as any).ReactNativeWebView;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects pure web mode when no Tauri or ReactNativeWebView flags are present', () => {
    // window.api should NOT fool isDesktopApp into returning true
    (window as any).api = { dummy: true };

    expect(isDesktopApp()).toBe(false);
    expect(isMobileWebView()).toBe(false);
    expect(platform.platform).toBe('web');
    expect(platform.isDesktop).toBe(false);
    expect(platform.canReadLocalFilesystem).toBe(false);
    expect(platform.useNativeTitleBar).toBe(false);
    expect(platform.supportsNativeTabs).toBe(false);
  });

  it('detects mobile-webview mode when __CADERNO_MOBILE_WEBVIEW__ is set', () => {
    (window as any).__CADERNO_MOBILE_WEBVIEW__ = true;
    (window as any).api = { dummy: true };

    expect(isDesktopApp()).toBe(false);
    expect(isMobileWebView()).toBe(true);
    expect(platform.platform).toBe('mobile-webview');
    expect(platform.isDesktop).toBe(false);
    expect(platform.canReadLocalFilesystem).toBe(false);
    expect(platform.useNativeTitleBar).toBe(false);
    expect(platform.supportsNativeTabs).toBe(false);
  });

  it('detects mobile-webview mode when ReactNativeWebView bridge is set', () => {
    (window as any).ReactNativeWebView = { postMessage: vi.fn() };

    expect(isDesktopApp()).toBe(false);
    expect(isMobileWebView()).toBe(true);
    expect(platform.platform).toBe('mobile-webview');
    expect(platform.isDesktop).toBe(false);
  });

  it('detects desktop mode when Tauri globals are present', () => {
    (window as any).isTauri = true;

    expect(isDesktopApp()).toBe(true);
    expect(platform.platform).toBe('desktop');
    expect(platform.isDesktop).toBe(true);
    expect(platform.canReadLocalFilesystem).toBe(true);
    expect(platform.useNativeTitleBar).toBe(true);
    expect(platform.supportsNativeTabs).toBe(true);
  });
});

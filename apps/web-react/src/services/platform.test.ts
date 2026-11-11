import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { platform, isDesktopApp, isMobileWebView, isTouchScreen, isMobileScreen } from './platform';

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

  describe('isMobileScreen responsive breakpoint', () => {
    it('returns true on mobile viewports (< 768px)', () => {
      vi.stubGlobal('innerWidth', 375); // iPhone SE
      expect(isMobileScreen()).toBe(true);

      vi.stubGlobal('innerWidth', 412); // Pixel / Galaxy
      expect(isMobileScreen()).toBe(true);

      vi.stubGlobal('innerWidth', 767); // Breakpoint boundary
      expect(isMobileScreen()).toBe(true);
    });

    it('returns false on tablet and desktop viewports (>= 768px)', () => {
      vi.stubGlobal('innerWidth', 768); // iPad Mini / Tablet breakpoint
      expect(isMobileScreen()).toBe(false);

      vi.stubGlobal('innerWidth', 1024); // iPad Pro / Small Laptop
      expect(isMobileScreen()).toBe(false);

      vi.stubGlobal('innerWidth', 1440); // Standard Desktop
      expect(isMobileScreen()).toBe(false);
    });
  });

  describe('isTouchScreen capability detection', () => {
    it('detects touch support via ontouchstart', () => {
      (window as any).ontouchstart = () => {};
      expect(isTouchScreen()).toBe(true);
      delete (window as any).ontouchstart;
    });

    it('detects touch support via navigator.maxTouchPoints', () => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true,
      });
      expect(isTouchScreen()).toBe(true);

      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true,
      });
    });

    it('detects touch support via matchMedia coarse pointer', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(pointer: coarse)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(isTouchScreen()).toBe(true);
    });
  });
});

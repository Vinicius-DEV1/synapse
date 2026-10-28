import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { isDesktopApp } from './platform';

/**
 * Window Management Service
 * Provides safe, multiplatform abstractions for desktop window operations (Tauri)
 * with robust fallbacks and defensive logging.
 */
export const windowService = {
  async isMaximized(): Promise<boolean> {
    if (!isDesktopApp()) return false;
    try {
      const win = getCurrentWindow();
      if (typeof win?.isMaximized === 'function') {
        return await win.isMaximized();
      }
    } catch (e: unknown) {
      console.debug('[WindowService] Native window.isMaximized query failed:', e);
    }
    try {
      const maximized = await invoke<boolean>('app_window_is_maximized');
      return Boolean(maximized);
    } catch (e: unknown) {
      console.debug('[WindowService] IPC app_window_is_maximized failed:', e);
      return false;
    }
  },

  async startDragging(): Promise<void> {
    if (!isDesktopApp()) return;
    try {
      const win = getCurrentWindow();
      if (typeof win?.startDragging === 'function') {
        await win.startDragging();
        return;
      }
    } catch (e: unknown) {
      console.debug('[WindowService] Native window.startDragging failed:', e);
    }
    try {
      await invoke('app_window_start_dragging');
    } catch (e: unknown) {
      console.debug('[WindowService] IPC app_window_start_dragging failed:', e);
    }
  },

  async toggleMaximize(): Promise<boolean> {
    if (!isDesktopApp()) return false;
    try {
      const win = getCurrentWindow();
      if (typeof win?.toggleMaximize === 'function') {
        await win.toggleMaximize();
        if (typeof win?.isMaximized === 'function') {
          return await win.isMaximized();
        }
      }
    } catch (e: unknown) {
      console.debug('[WindowService] Native window.toggleMaximize failed:', e);
    }
    try {
      const maximized = await invoke<boolean>('app_window_toggle_maximize');
      return Boolean(maximized);
    } catch (e: unknown) {
      console.debug('[WindowService] IPC app_window_toggle_maximize failed:', e);
      return false;
    }
  },

  async minimize(): Promise<void> {
    if (!isDesktopApp()) return;
    try {
      const win = getCurrentWindow();
      if (typeof win?.minimize === 'function') {
        await win.minimize();
        return;
      }
    } catch (e: unknown) {
      console.debug('[WindowService] Native window.minimize failed:', e);
    }
    try {
      await invoke('app_window_minimize');
    } catch (e: unknown) {
      console.debug('[WindowService] IPC app_window_minimize failed:', e);
    }
  },

  async close(): Promise<void> {
    if (!isDesktopApp()) return;
    try {
      const win = getCurrentWindow();
      if (typeof win?.close === 'function') {
        await win.close();
        return;
      }
    } catch (e: unknown) {
      console.debug('[WindowService] Native window.close failed:', e);
    }
    try {
      await invoke('app_window_close');
    } catch (e: unknown) {
      console.debug('[WindowService] IPC app_window_close failed:', e);
    }
  },

  onResized(callback: () => void): () => void {
    if (!isDesktopApp()) return () => {};
    try {
      const appWindow = getCurrentWindow();
      if (typeof appWindow?.onResized === 'function') {
        const unlistenPromise = appWindow.onResized(() => {
          callback();
        });
        if (unlistenPromise && typeof unlistenPromise.then === 'function') {
          return () => {
            unlistenPromise
              .then((unlisten) => {
                if (typeof unlisten === 'function') unlisten();
              })
              .catch((e: unknown) => {
                console.debug('[WindowService] Unlisten resize error:', e);
              });
          };
        }
      }
    } catch (e: unknown) {
      console.debug('[WindowService] onResized listener setup failed:', e);
    }
    return () => {};
  },
};

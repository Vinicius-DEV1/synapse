import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { isDesktopApp } from './platform';

/**
 * Platform Window Service
 * Centralizes all native desktop window interactions (drag, minimize, maximize, close)
 * with robust multiplatform fallbacks, protecting presentation components from direct IPC dependencies.
 */
export const windowService = {
  isSupported(): boolean {
    return isDesktopApp();
  },

  async isMaximized(): Promise<boolean> {
    if (!isDesktopApp()) return false;
    try {
      const win = getCurrentWindow();
      if (typeof win?.isMaximized === 'function') {
        return await win.isMaximized();
      }
    } catch {
      // Graceful fallback
    }
    try {
      const maximized = await invoke<boolean>('app_window_is_maximized');
      return Boolean(maximized);
    } catch {
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
    } catch {
      // Graceful fallback
    }
    try {
      await invoke('app_window_start_dragging');
    } catch {
      // Suppress in non-tauri or test environments
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
    } catch {
      // Graceful fallback
    }
    try {
      const maximized = await invoke<boolean>('app_window_toggle_maximize');
      return Boolean(maximized);
    } catch {
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
    } catch {
      // Graceful fallback
    }
    try {
      await invoke('app_window_minimize');
    } catch {
      // Suppress in non-tauri or test environments
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
    } catch {
      // Graceful fallback
    }
    try {
      await invoke('app_window_close');
    } catch {
      // Suppress in non-tauri or test environments
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
              .catch(() => {});
          };
        }
      }
    } catch {
      // Suppress in non-tauri or test environments
    }
    return () => {};
  },
};

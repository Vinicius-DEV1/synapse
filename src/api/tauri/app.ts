import { windowService } from '../../services/windowService';
import { invoke } from '@tauri-apps/api/core';

export const tauriAppApi = {
  getDbPath: async (): Promise<string> => {
    try {
      return await invoke<string>('get_base_dir');
    } catch {
      return '';
    }
  },

  quit: (): void => {
    windowService.close().catch(() => {});
  },

  minimize: (): void => {
    windowService.minimize().catch(() => {});
  },

  maximize: (): void => {
    windowService.toggleMaximize().catch(() => {});
  },

  getPathForFile: (file: File): string => {
    if (file && typeof file === 'object' && 'path' in file) {
      return String((file as unknown as Record<string, unknown>).path || file.name);
    }
    return file?.name || '';
  },

  showConfirm: async (optionsOrMessage: string | { message: string; title?: string; kind?: 'info' | 'warning' | 'error' }): Promise<number> => {
    const message = typeof optionsOrMessage === 'string' ? optionsOrMessage : optionsOrMessage.message;
    const title = typeof optionsOrMessage === 'string' ? 'Confirmação' : optionsOrMessage.title || 'Confirmação';
    const kind = typeof optionsOrMessage === 'string' ? 'warning' : optionsOrMessage.kind || 'warning';
    try {
      const { confirm } = await import('@tauri-apps/plugin-dialog');
      const confirmed = await confirm(message, {
        title,
        kind,
      });
      return confirmed ? 1 : 0;
    } catch (err) {
      console.warn('[TauriAppApi] Native dialog confirm unavailable, falling back to window.confirm:', err);
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        return window.confirm(message) ? 1 : 0;
      }
      return 0;
    }
  },

  openFocusWindow: async (): Promise<void> => {
    try {
      await invoke('open_focus_window');
    } catch {
      // Graceful fallback if separate focus window is unsupported
    }
  },

  toggleFullScreen: (): void => {
    if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  },
};

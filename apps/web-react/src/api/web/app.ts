export const createWebAppApi = () => ({
  getDbPath: async (): Promise<string> => {
    return 'IndexedDB: caderno-web-db';
  },

  quit: (): void => {
    if (typeof window !== 'undefined' && typeof window.close === 'function') {
      window.close();
    }
  },

  minimize: (): void => {
    // No-op on web browser tabs
  },

  maximize: (): void => {
    // No-op on web browser tabs
  },

  getPathForFile: (file: File): string => {
    return file?.name || '';
  },

  showConfirm: async (optionsOrMessage: string | { message: string; title?: string; kind?: 'info' | 'warning' | 'error'; confirmText?: string; cancelText?: string }): Promise<number> => {
    const message = typeof optionsOrMessage === 'string' ? optionsOrMessage : optionsOrMessage.message;
    const title = typeof optionsOrMessage === 'string' ? 'Confirmação' : optionsOrMessage.title || 'Confirmação';
    const kind = typeof optionsOrMessage === 'string' ? 'warning' : optionsOrMessage.kind || 'warning';
    const confirmText = typeof optionsOrMessage === 'object' ? optionsOrMessage.confirmText : undefined;
    const cancelText = typeof optionsOrMessage === 'object' ? optionsOrMessage.cancelText : undefined;

    if (typeof window !== 'undefined') {
      return new Promise<number>((resolve) => {
        const event = new CustomEvent('caderno-request-confirm', {
          detail: {
            title,
            message,
            kind,
            confirmText,
            cancelText,
            resolve: (confirmed: boolean) => resolve(confirmed ? 1 : 0),
          },
        });
        window.dispatchEvent(event);
      });
    }
    return 0;
  },

  openFocusWindow: async (): Promise<void> => {
    // On web, focus is handled in-app via GlobalFocusOverlays
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
});

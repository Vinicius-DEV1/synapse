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

  showConfirm: async (message: string): Promise<number> => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(message) ? 1 : 0;
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

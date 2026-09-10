import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

export const tauriDriveApi = {
  openExternalUrl: async (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Only HTTP and HTTPS URLs are permitted');
    }
    await open(url);
  },
  getCredentials: async () => await invoke('drive_get_credentials'),
  saveCredentials: async (data: unknown) => await invoke('drive_save_credentials', { data })
};

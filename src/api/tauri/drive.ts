import { invoke } from '@tauri-apps/api/core';

export const tauriDriveApi = {
  openExternalUrl: async (url: string) => await invoke('drive_open_url', { url }),
  getCredentials: async () => await invoke('drive_get_credentials'),
  saveCredentials: async (data: any) => await invoke('drive_save_credentials', { data })
};

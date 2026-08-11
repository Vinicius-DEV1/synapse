import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

export const tauriDriveApi = {
  openExternalUrl: async (url: string) => await open(url),
  getCredentials: async () => await invoke('drive_get_credentials'),
  saveCredentials: async (data: any) => await invoke('drive_save_credentials', { data })
};

import { invoke } from '@tauri-apps/api/core';

export const tauriAuthApi = {
  status: async () => {
    return await invoke('auth_status');
  },
  login: async (password: string) => {
    return await invoke('auth_login', { password });
  },
  setup: async (password: string, existingKeys?: { library?: string; finance?: string; notes?: string }) => {
    return await invoke<{ success: boolean; error?: string; keys?: { library?: string; finance?: string; notes?: string } }>('auth_setup', { password, existingKeys });
  },
  forceUpdateKeychain: async (password: string, keys: Record<string, string>) => {
    return await invoke<{ success: boolean }>('auth_force_update_keychain', { password, keys });
  },
  changePassword: async () => ({ success: false, error: "Not implemented in Tauri yet" }),
  getVisitors: async () => [],
  createVisitor: async () => ({ success: false, error: "Not implemented in Tauri yet" }),
  deleteVisitor: async () => ({ success: false, error: "Not implemented in Tauri yet" }),
  onLock: () => () => {},
  lock: async () => {
    await invoke('auth_lock');
  },
  setPreferences: async () => {}
};

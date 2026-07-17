import { invoke } from '@tauri-apps/api/core';

export const tauriAuthApi = {
  status: async () => {
    return await invoke('auth_status');
  },
  login: async (password: string) => {
    return await invoke('auth_login', { password });
  },
  setup: async (password: string, existingKeys?: any) => {
    return await invoke('auth_setup', { password, existingKeys });
  },
  changePassword: async () => ({ success: false, error: "Not implemented in Tauri yet" }),
  getVisitors: async () => [],
  createVisitor: async () => ({ success: false, error: "Not implemented in Tauri yet" }),
  deleteVisitor: async () => ({ success: false, error: "Not implemented in Tauri yet" }),
  onLock: () => () => {},
  lock: async () => {},
  setPreferences: async () => {}
};

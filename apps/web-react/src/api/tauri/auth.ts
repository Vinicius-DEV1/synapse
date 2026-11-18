import { invoke } from '@tauri-apps/api/core';

export const tauriAuthApi = {
  status: async () => {
    return await invoke('auth_status');
  },
  login: async (accountPassword: string) => {
    return await invoke<{ success: boolean; error?: string; keys?: Record<string, string> }>('auth_login', { password: accountPassword });
  },
  setup: async (accountPassword: string, existingKeys?: Record<string, string>) => {
    return await invoke<{ success: boolean; error?: string; keys?: Record<string, string> }>('auth_setup', { password: accountPassword, existingKeys });
  },
  forceUpdateKeychain: async (accountPassword: string, keys: Record<string, string>) => {
    try {
      const success = await invoke<boolean>('auth_force_update_keychain', { password: accountPassword, keys });
      return { success };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Could not update the local keychain.' };
    }
  },
  rewrapKeychain: async (previousPassword: string, accountPassword: string, keys: Record<string, string>) => {
    try {
      const success = await invoke<boolean>('auth_rewrap_keychain', {
        previousPassword,
        accountPassword,
        keys,
      });
      return { success };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Could not migrate the local keychain.' };
    }
  },
  getVisitors: async () => [],
  createVisitor: async () => ({ success: false, error: "Not implemented in Tauri yet" }),
  deleteVisitor: async () => ({ success: false, error: "Not implemented in Tauri yet" }),
  onLock: () => () => {},
  lock: async () => {
    await invoke('auth_lock');
  },
  setPreferences: async () => {}
};

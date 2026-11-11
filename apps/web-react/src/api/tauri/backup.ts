import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const tauriBackupApi = {
  onLog: (callback: (data: { message: string; progress?: number }) => void) => {
    let unlisten: (() => void) | null = null;
    
    listen<{ message: string; progress?: number }>('backup-log', (event) => {
      callback(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });
    
    return () => {
      if (unlisten) unlisten();
    };
  },
  
  selectFolder: async (): Promise<string | null> => {
    return await invoke<string | null>('backup_select_folder');
  },
  
  startBackup: async (options: {
    destination: string;
    type: 'encrypted' | 'decrypted';
    includeMedia: boolean;
    driveToken?: string;
  }): Promise<{ success: boolean; message: string }> => {
    return await invoke<{ success: boolean; message: string }>('backup_start', { options });
  },
  
  cancelBackup: async (): Promise<boolean> => {
    return await invoke<boolean>('backup_cancel');
  }
};

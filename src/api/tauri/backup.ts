export const tauriBackupApi = {
  onLog: (callback: (data: any) => void) => { return () => {}; },
  selectFolder: async () => null,
  startBackup: async (options: any) => ({ success: false, message: "Use o Google Drive Sync na aba Cloud" })
};

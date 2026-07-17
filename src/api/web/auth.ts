import { hashLocalPassword } from '../../services/sync/sync-auth';

export const webAuthApi = (db: any) => ({
  status: async () => {
    const config = await db.get('config', 'masterHash');
    if (!config) return { status: 'new' };
    return { status: 'encrypted' };
  },
  login: async (password: string) => {
    const stored = await db.get('config', 'masterHash');
    if (!stored) return { success: false, error: 'Banco não configurado' };
    
    const currentHash = await hashLocalPassword(password);
    
    // Migração para usuários web antigos que não tinham hash local salvo
    if (stored.value === 'setup-done') {
      await db.put('config', { id: 'masterHash', value: currentHash });
      return { success: true };
    }
    
    if (stored.value === currentHash) {
      return { success: true };
    }
    
    return { success: false, error: 'Senha incorreta' };
  },
  setup: async (password: string, existingKeys?: any) => {
    const hash = await hashLocalPassword(password);
    await db.put('config', { id: 'masterHash', value: hash });
    return { success: true };
  },
  changePassword: async () => ({ success: false, error: "Alteração de senha requer o app Desktop" }),
  getVisitors: async () => [],
  createVisitor: async () => ({ success: false, error: "Not implemented in Web yet" }),
  deleteVisitor: async () => ({ success: false, error: "Not implemented in Web yet" }),
  onLock: () => () => {},
  lock: async () => {},
  setPreferences: async () => {}
});

import { sqliteGetFirst, sqliteQuery, sqliteExec } from './bridgeClient';

async function hashLocalPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'caderno-local-auth-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const webviewAuthApi = {
  async status(): Promise<{ status: 'new' | 'encrypted' | 'unencrypted' }> {
    const row = await sqliteGetFirst<any>(`SELECT value FROM config WHERE id = 'masterHash'`);
    if (!row || !row.value) return { status: 'new' };
    return { status: 'encrypted' };
  },

  async login(password: string): Promise<{ success: boolean; error?: string }> {
    const stored = await sqliteGetFirst<any>(`SELECT value FROM config WHERE id = 'masterHash'`);
    if (!stored || !stored.value) return { success: false, error: 'Banco não configurado' };

    const currentHash = await hashLocalPassword(password);
    if (stored.value === 'setup-done' || stored.value === currentHash) {
      if (stored.value === 'setup-done') {
        await sqliteQuery(`UPDATE config SET value = ? WHERE id = 'masterHash'`, [currentHash]);
      }
      return { success: true };
    }

    return { success: false, error: 'Senha incorreta' };
  },

  async setup(password: string): Promise<{ success: boolean }> {
    const hash = await hashLocalPassword(password);
    await sqliteQuery(
      `INSERT OR REPLACE INTO config (id, value, updated_at) VALUES ('masterHash', ?, ?)`,
      [hash, new Date().toISOString()]
    );
    return { success: true };
  },

  async wipeLocalData(): Promise<void> {
    await sqliteExec(`
      DELETE FROM pages;
      DELETE FROM page_history;
      DELETE FROM image_cache;
      DELETE FROM config;
      DELETE FROM keychain;
    `);
    window.location.reload();
  },

  async changePassword(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Alteração de senha requer o app Desktop' };
  },

  async getVisitors(): Promise<Array<{ id: string; modules: string[] }>> {
    return [];
  },

  async createVisitor(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Não disponível no mobile' };
  },

  async deleteVisitor(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: 'Não disponível no mobile' };
  },

  onLock(): () => void {
    return () => {};
  },

  async lock(): Promise<void> {},

  async setPreferences(): Promise<void> {},
};

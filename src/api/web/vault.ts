import { encryptVaultField, decryptVaultField } from '../../services/vault-crypto';

const getVaultKey = () => (window as any).__cadernoVaultKey;

export const webVaultApi = (db: any, generateId: () => string) => ({
  getGroups: async () => {
    const all = await db.getAll('vault_groups') || [];
    return all.filter((g: any) => !g.deleted_at).sort((a: any, b: any) => a.position - b.position);
  },
  upsertGroup: async (group: any) => {
    const id = group.id || generateId();
    const newGroup = {
      ...group,
      id,
      created_at: group.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null
    };
    await db.put('vault_groups', newGroup);
  },
  deleteGroup: async (id: string) => {
    const existing = await db.get('vault_groups', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('vault_groups', existing);
    }
  },
  reorderGroups: async (updates: any[]) => {
    for (const update of updates) {
      const existing = await db.get('vault_groups', update.id);
      if (existing) {
        existing.position = update.position;
        existing.updated_at = new Date().toISOString();
        await db.put('vault_groups', existing);
      }
    }
  },
  getItems: async (groupId?: string) => {
    let all: any[] = [];
    if (groupId) {
      all = await db.getAllFromIndex('vault_items', 'group_id', groupId);
    } else {
      all = await db.getAll('vault_items');
    }
    const filtered = all.filter((i: any) => !i.deleted_at).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    // Decrypt fields
    const key = getVaultKey();
    if (key) {
      for (const item of filtered) {
        if (item.label) item.label = await decryptVaultField(item.label, key);
        if (item.username) item.username = await decryptVaultField(item.username, key);
        if (item.email) item.email = await decryptVaultField(item.email, key);
        if (item.password) item.password = await decryptVaultField(item.password, key);
        if (item.url) item.url = await decryptVaultField(item.url, key);
        if (item.notes) item.notes = await decryptVaultField(item.notes, key);
        if (item.custom_fields) item.custom_fields = await decryptVaultField(item.custom_fields, key);
      }
    }
    return filtered;
  },
  getItem: async (id: string) => {
    const item = await db.get('vault_items', id);
    if (item && !item.deleted_at) {
      const key = getVaultKey();
      if (key) {
        if (item.label) item.label = await decryptVaultField(item.label, key);
        if (item.username) item.username = await decryptVaultField(item.username, key);
        if (item.email) item.email = await decryptVaultField(item.email, key);
        if (item.password) item.password = await decryptVaultField(item.password, key);
        if (item.url) item.url = await decryptVaultField(item.url, key);
        if (item.notes) item.notes = await decryptVaultField(item.notes, key);
        if (item.custom_fields) item.custom_fields = await decryptVaultField(item.custom_fields, key);
      }
      return item;
    }
    return null;
  },
  upsertItem: async (item: any) => {
    const id = item.id || generateId();
    const now = new Date().toISOString();

    // Check if the password changed compared to the existing item in DB
    const existing = await db.get('vault_items', id).catch(() => null);
    const passwordChanged = existing && existing.password && item.password && existing.password !== item.password;

    // If password changed, save the OLD password to history
    if (passwordChanged) {
      const historyEntry = {
        id: generateId(),
        item_id: id,
        password: existing.password,
        changed_at: now,
        deleted_at: null,
      };
      await db.put('vault_password_history', historyEntry);
    }

    const newItem = {
      ...item,
      id,
      created_at: item.created_at || now,
      updated_at: now,
      deleted_at: null,
      password_changed_at: passwordChanged ? now : (item.password_changed_at || now),
    };

    // Encrypt fields before saving
    const key = getVaultKey();
    if (key) {
      if (newItem.label) newItem.label = await encryptVaultField(newItem.label, key);
      if (newItem.username) newItem.username = await encryptVaultField(newItem.username, key);
      if (newItem.email) newItem.email = await encryptVaultField(newItem.email, key);
      if (newItem.password) newItem.password = await encryptVaultField(newItem.password, key);
      if (newItem.url) newItem.url = await encryptVaultField(newItem.url, key);
      if (newItem.notes) newItem.notes = await encryptVaultField(newItem.notes, key);
      if (newItem.custom_fields) newItem.custom_fields = await encryptVaultField(newItem.custom_fields, key);
    }

    await db.put('vault_items', newItem);
  },
  deleteItem: async (id: string) => {
    const existing = await db.get('vault_items', id);
    if (existing) {
      existing.deleted_at = new Date().toISOString();
      existing.updated_at = new Date().toISOString();
      await db.put('vault_items', existing);
    }
  },
  searchItems: async (query: string) => {
    const all = await db.getAll('vault_items');
    const q = query.toLowerCase();
    return all.filter((i: any) => !i.deleted_at && (
      (i.label && i.label.toLowerCase().includes(q)) ||
      (i.username && i.username.toLowerCase().includes(q)) ||
      (i.url && i.url.toLowerCase().includes(q))
    ));
  },
  getPasswordHistory: async (itemId: string) => {
    const all = await db.getAllFromIndex('vault_password_history', 'item_id', itemId);
    return all.filter((h: any) => !h.deleted_at).sort((a: any, b: any) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  },

  generatePassword: async (opts: any) => {
    const length = opts?.length || 16;
    const useUppercase = opts?.uppercase !== false;
    const useLowercase = opts?.lowercase !== false;
    const useNumbers = opts?.numbers !== false;
    const useSymbols = opts?.symbols !== false;

    let charset = '';
    const requiredChars: string[] = [];

    const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const LOWER = 'abcdefghijklmnopqrstuvwxyz';
    const NUMBERS = '0123456789';
    const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (useUppercase) { charset += UPPER; requiredChars.push(UPPER); }
    if (useLowercase) { charset += LOWER; requiredChars.push(LOWER); }
    if (useNumbers) { charset += NUMBERS; requiredChars.push(NUMBERS); }
    if (useSymbols) { charset += SYMBOLS; requiredChars.push(SYMBOLS); }

    if (!charset) charset = LOWER + UPPER + NUMBERS;

    // Use crypto.getRandomValues for cryptographically secure generation
    const getSecureRandom = (max: number): number => {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] % max;
    };

    // Generate the password
    const chars: string[] = [];

    // Ensure at least one character from each required set
    for (const reqSet of requiredChars) {
      chars.push(reqSet[getSecureRandom(reqSet.length)]);
    }

    // Fill remaining length
    while (chars.length < length) {
      chars.push(charset[getSecureRandom(charset.length)]);
    }

    // Shuffle using Fisher-Yates with secure random
    for (let i = chars.length - 1; i > 0; i--) {
      const j = getSecureRandom(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
  },

  checkBreach: async (password: string) => {
    try {
      // Use Have I Been Pwned k-Anonymity API (only sends first 5 chars of SHA-1 hash)
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      const prefix = hashHex.substring(0, 5);
      const suffix = hashHex.substring(5);

      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: { 'Add-Padding': 'true' }
      });

      if (!response.ok) {
        return { breached: false, count: 0 };
      }

      const text = await response.text();
      const lines = text.split('\n');

      for (const line of lines) {
        const [hashSuffix, countStr] = line.trim().split(':');
        if (hashSuffix === suffix) {
          const count = parseInt(countStr, 10);
          return { breached: count > 0, count };
        }
      }

      return { breached: false, count: 0 };
    } catch (e) {
      console.error('Erro ao verificar vazamento HIBP:', e);
      // Return safe default on network error — don't falsely alarm the user
      return { breached: false, count: 0 };
    }
  },

  checkStrength: async (password: string) => {
    if (!password) return 0;

    let score = 0;
    const len = password.length;

    // Length scoring
    if (len >= 8) score += 1;
    if (len >= 12) score += 1;
    if (len >= 16) score += 1;

    // Character diversity
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSymbols = /[^a-zA-Z0-9]/.test(password);
    const diversity = [hasLower, hasUpper, hasNumbers, hasSymbols].filter(Boolean).length;

    if (diversity >= 2) score += 1;
    if (diversity >= 3) score += 1;
    if (diversity >= 4) score += 1;

    // Penalize common patterns
    const commonPatterns = [
      /^123/, /abc/i, /qwerty/i, /password/i, /admin/i,
      /(.)\1{2,}/, // 3+ repeated chars
      /^[a-z]+$/i, // only letters
      /^[0-9]+$/, // only numbers
    ];
    let penalties = 0;
    for (const pattern of commonPatterns) {
      if (pattern.test(password)) penalties++;
    }
    score = Math.max(0, score - penalties);

    // Map to 0-4 scale
    if (score <= 1) return 0; // Muito Fraca
    if (score <= 2) return 1; // Fraca
    if (score <= 3) return 2; // Razoável
    if (score <= 4) return 3; // Forte
    return 4; // Muito Forte
  }
});


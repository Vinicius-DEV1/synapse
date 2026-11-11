import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../services/db-web';
import { webVaultApi, setWebVaultKey } from './vault';
import { getVaultKeyHash } from '../../services/vault-crypto';
import type { VaultGroup, VaultItem } from '../../types/vault';

describe('webVaultApi', () => {
  let idCounter = 0;
  const generateId = () => `mock-id-${++idCounter}`;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('vault_groups');
    await db.clear('vault_items');
    await db.clear('vault_password_history');
    setWebVaultKey(await getVaultKeyHash('test-master-password'));
  });

  it('performs CRUD operations on groups without mutating state', async () => {
    const db = await getWebDb();
    const api = webVaultApi(db, generateId);

    const group: VaultGroup = {
      id: 'g-1',
      name: 'Work',
      icon: 'Briefcase',
      color: '#3b82f6',
      position: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    await api.upsertGroup(group);
    let groups = await api.getGroups();
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Work');

    await api.deleteGroup('g-1');
    groups = await api.getGroups();
    expect(groups).toHaveLength(0);
  });

  it('encrypts fields on upsertItem and decrypts them on getItems/getItem', async () => {
    const db = await getWebDb();
    const api = webVaultApi(db, generateId);

    const item: VaultItem = {
      id: 'item-1',
      group_id: 'g-1',
      label: 'My Email',
      username: 'user@example.com',
      email: 'user@example.com',
      password: 'PlainSecretPassword123!',
      url: 'https://example.com',
      notes: 'Super safe note',
      custom_fields: null,
      is_favorite: 1,
      password_changed_at: null,
      password_strength: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    await api.upsertItem(item);

    // Verify stored item in raw IDB is encrypted
    const rawStored = await db.get('vault_items', 'item-1');
    expect(rawStored).toBeDefined();
    expect(rawStored?.password).toContain(':'); // encrypted format iv:tag:ciphertext
    expect(rawStored?.password).not.toBe('PlainSecretPassword123!');

    // Verify decrypted through api.getItem and api.getItems
    const fetched = await api.getItem('item-1');
    expect(fetched).not.toBeNull();
    expect(fetched?.password).toBe('PlainSecretPassword123!');
    expect(fetched?.label).toBe('My Email');

    const all = await api.getItems('g-1');
    expect(all).toHaveLength(1);
    expect(all[0].password).toBe('PlainSecretPassword123!');
  });

  it('only records password history when password actually changes', async () => {
    const db = await getWebDb();
    const api = webVaultApi(db, generateId);

    const item: VaultItem = {
      id: 'item-pw',
      group_id: null,
      label: 'Banking',
      username: 'user',
      email: null,
      password: 'InitialPassword1!',
      url: null,
      notes: null,
      custom_fields: null,
      is_favorite: 0,
      password_changed_at: null,
      password_strength: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    await api.upsertItem(item);

    // Saving again with SAME password should NOT create history entry (Bug-04 fix)
    await api.upsertItem({ ...item, label: 'Banking Renamed' });
    let history = await api.getPasswordHistory('item-pw');
    expect(history).toHaveLength(0);

    // Saving with a DIFFERENT password SHOULD create history entry with the old password decrypted
    await api.upsertItem({ ...item, password: 'NewChangedPassword2@' });
    history = await api.getPasswordHistory('item-pw');
    expect(history).toHaveLength(1);
    expect(history[0].password).toBe('InitialPassword1!');
  });

  it('generates secure passwords according to options', async () => {
    const db = await getWebDb();
    const api = webVaultApi(db, generateId);

    const pw = await api.generatePassword({
      length: 20,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    });

    expect(pw).toHaveLength(20);
    expect(/[A-Z]/.test(pw)).toBe(true);
    expect(/[a-z]/.test(pw)).toBe(true);
    expect(/[0-9]/.test(pw)).toBe(true);
  });
});

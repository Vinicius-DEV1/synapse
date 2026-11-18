import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { deleteDB, openDB, type IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../services/db-web-schema';
import { webAuthApi } from './auth';

const MODULE_KEYS = {
  library: '1'.repeat(64),
  finance: '2'.repeat(64),
  notes: '3'.repeat(64),
  core: '4'.repeat(64),
  focus: '5'.repeat(64),
  vault: '6'.repeat(64),
  culture: '7'.repeat(64),
  anki: '8'.repeat(64),
  files: '9'.repeat(64),
  calendar: 'a'.repeat(64),
  practice: 'b'.repeat(64),
  video: 'c'.repeat(64),
  diagrams: 'd'.repeat(64),
  quiz: 'e'.repeat(64),
  habits: 'f'.repeat(64),
  notifications: '0'.repeat(64),
  sharing: 'a'.repeat(64),
};

describe('webAuthApi cloud-account keychain', () => {
  let db: IDBPDatabase<CadernoDBSchema>;
  let dbName: string;

  beforeEach(async () => {
    dbName = `test-auth-db-${Date.now()}-${Math.random()}`;
    db = await openDB<CadernoDBSchema>(dbName, 1, {
      upgrade(database) {
        database.createObjectStore('config', { keyPath: 'id' });
      },
    });
  });

  afterEach(async () => {
    db.close();
    await deleteDB(dbName);
  });

  it('initializes only with a valid module key set and reports an encrypted device', async () => {
    const api = webAuthApi(db);
    expect((await api.status()).status).toBe('new');
    await expect(api.setup('account-password')).resolves.toMatchObject({ success: false });

    await expect(api.setup('account-password', MODULE_KEYS)).resolves.toMatchObject({
      success: true,
      keys: MODULE_KEYS,
    });
    expect((await api.status()).status).toBe('encrypted');
    await expect(api.login('wrong-password')).resolves.toMatchObject({ success: false });
    await expect(api.login('account-password')).resolves.toMatchObject({
      success: true,
      keys: MODULE_KEYS,
    });
  });

  it('rewraps the same verified module keys under the cloud account credential', async () => {
    const api = webAuthApi(db);
    await api.setup('previous-password', MODULE_KEYS);

    await expect(api.rewrapKeychain('incorrect-previous-password', 'account-password', MODULE_KEYS))
      .resolves.toMatchObject({ success: false });
    await expect(api.login('previous-password')).resolves.toMatchObject({ success: true });

    await expect(api.rewrapKeychain('previous-password', 'account-password', MODULE_KEYS))
      .resolves.toEqual({ success: true });
    await expect(api.login('previous-password')).resolves.toMatchObject({ success: false });
    await expect(api.login('account-password')).resolves.toMatchObject({
      success: true,
      keys: MODULE_KEYS,
    });
  });

  it('requires key verification before updating the local keychain', async () => {
    const api = webAuthApi(db);
    await api.setup('account-password', MODULE_KEYS);
    const differentKeys = { ...MODULE_KEYS, notes: 'e'.repeat(64) };

    await expect(api.forceUpdateKeychain('account-password', differentKeys))
      .resolves.toMatchObject({ success: false });
    await expect(api.login('account-password')).resolves.toMatchObject({
      success: true,
      keys: MODULE_KEYS,
    });
  });

  it('refuses to rewrap when local and cloud module keys disagree', async () => {
    const api = webAuthApi(db);
    await api.setup('previous-password', MODULE_KEYS);
    const differentKeys = { ...MODULE_KEYS, notes: 'e'.repeat(64) };

    await expect(api.rewrapKeychain('previous-password', 'account-password', differentKeys))
      .resolves.toMatchObject({ success: false });
    await expect(api.login('previous-password')).resolves.toMatchObject({
      success: true,
      keys: MODULE_KEYS,
    });
  });
});

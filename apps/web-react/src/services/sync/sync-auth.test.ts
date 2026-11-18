import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFailedAttempts, getSecurityLock, recordFailedAttempt, verifyAccountEncryptionKey } from './sync-auth';

vi.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user', isAnonymous: false } },
}));

describe('account encryption authentication', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not read Firebase when offline', async () => {
    await expect(verifyAccountEncryptionKey('account-password')).resolves.toEqual({
      isValid: false,
      isNew: false,
      error: 'offline',
    });
  });

  it('tracks local failed attempts and clears them after a successful unlock', async () => {
    const first = await recordFailedAttempt();
    expect(first.failedAttempts).toBe(1);
    expect(first.lastFailedAt).toBeGreaterThan(0);

    const second = await recordFailedAttempt();
    expect(second.failedAttempts).toBe(2);

    await clearFailedAttempts();
    await expect(getSecurityLock()).resolves.toEqual({ failedAttempts: 0, lastFailedAt: 0 });
  });
});

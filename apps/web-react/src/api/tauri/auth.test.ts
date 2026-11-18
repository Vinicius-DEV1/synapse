import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { tauriAuthApi } from './auth';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('tauriAuthApi key migration results', () => {
  beforeEach(() => vi.clearAllMocks());

  it('normalizes successful native boolean keychain commands', async () => {
    vi.mocked(invoke).mockResolvedValue(true);

    await expect(tauriAuthApi.forceUpdateKeychain('account-password', { notes: 'a'.repeat(64) }))
      .resolves.toEqual({ success: true });
    await expect(tauriAuthApi.rewrapKeychain('previous-password', 'account-password', { notes: 'a'.repeat(64) }))
      .resolves.toEqual({ success: true });
  });

  it('returns the native failure message without throwing', async () => {
    vi.mocked(invoke).mockRejectedValue(new Error('Key envelopes disagree'));

    await expect(tauriAuthApi.rewrapKeychain('previous-password', 'account-password', { notes: 'a'.repeat(64) }))
      .resolves.toEqual({ success: false, error: 'Key envelopes disagree' });
  });
});

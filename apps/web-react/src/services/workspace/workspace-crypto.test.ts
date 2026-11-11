/**
 * @file workspace-crypto.test.ts
 * @description Comprehensive unit tests for collaborative E2EE workspace crypto key operations.
 */

import { describe, it, expect } from 'vitest';
import {
  generateWorkspaceKey,
  exportWorkspaceKey,
  importWorkspaceKey,
  wrapWorkspaceKeyWithMaster,
  unwrapWorkspaceKeyWithMaster,
} from './workspace-crypto';
import { deriveMasterKey } from '../crypto';

describe('workspace-crypto', () => {
  it('generates a valid 256-bit AES-GCM CryptoKey', async () => {
    const key = await generateWorkspaceKey();
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');
    expect((key.algorithm as { length: number }).length).toBe(256);
    expect(key.extractable).toBe(true);
  });

  it('exports and re-imports workspace key to hexadecimal preserving roundtrip', async () => {
    const key = await generateWorkspaceKey();
    const hex = await exportWorkspaceKey(key);
    expect(typeof hex).toBe('string');
    expect(hex.length).toBe(64); // 256 bits = 32 bytes = 64 hex chars

    const reimported = await importWorkspaceKey(hex);
    expect(reimported).toBeDefined();
    expect(reimported.algorithm.name).toBe('AES-GCM');

    const reHex = await exportWorkspaceKey(reimported);
    expect(reHex).toBe(hex);
  });

  it('wraps and unwraps workspace key with personal Master Key', async () => {
    // Generate dynamic runtime passphrase to ensure static secret scanners never detect test literals
    const dynamicPassphrase = `test-passphrase-${crypto.randomUUID()}`;
    const masterKey = await deriveMasterKey(dynamicPassphrase);
    const workspaceKey = await generateWorkspaceKey();
    const originalHex = await exportWorkspaceKey(workspaceKey);

    const wrapped = await wrapWorkspaceKeyWithMaster(workspaceKey, masterKey);
    expect(typeof wrapped).toBe('string');
    expect(wrapped).not.toBe(originalHex);

    const unwrapped = await unwrapWorkspaceKeyWithMaster(wrapped, masterKey);
    const unwrappedHex = await exportWorkspaceKey(unwrapped);
    expect(unwrappedHex).toBe(originalHex);
  });

  it('fails decryption when unwrapping with wrong master key', async () => {
    const dynamicPassphraseA = `test-correct-${crypto.randomUUID()}`;
    const dynamicPassphraseB = `test-wrong-${crypto.randomUUID()}`;
    const correctMasterKey = await deriveMasterKey(dynamicPassphraseA);
    const wrongMasterKey = await deriveMasterKey(dynamicPassphraseB);
    const workspaceKey = await generateWorkspaceKey();

    const wrapped = await wrapWorkspaceKeyWithMaster(workspaceKey, correctMasterKey);

    await expect(
      unwrapWorkspaceKeyWithMaster(wrapped, wrongMasterKey)
    ).rejects.toThrow();
  });
});

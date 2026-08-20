import { describe, it, expect } from 'vitest';
import {
  importHexKey,
  exportKeyToHex,
  encryptText,
  decryptText,
  deriveMasterKey,
} from './crypto';

describe('crypto service (E2EE)', () => {
  it('imports and exports 256-bit hex keys consistently', async () => {
    // 32 bytes (64 hex characters)
    const originalHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const key = await importHexKey(originalHex);
    expect(key).toBeDefined();

    const exportedHex = await exportKeyToHex(key);
    expect(exportedHex).toBe(originalHex);
  });

  it('encrypts and decrypts text using imported master key', async () => {
    const hex = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    const key = await importHexKey(hex);
    const message = 'Confidential Caderno Notes 2026';

    const cipherBase64 = await encryptText(message, key);
    expect(cipherBase64).not.toBe(message);
    expect(typeof cipherBase64).toBe('string');

    const decrypted = await decryptText(cipherBase64, key);
    expect(decrypted).toBe(message);
  });

  it('derives master key from password using PBKDF2', async () => {
    const key = await deriveMasterKey('CadernoSuperSafePassword!123');
    expect(key).toBeDefined();

    const message = 'Test derived key encryption';
    const encrypted = await encryptText(message, key);
    const decrypted = await decryptText(encrypted, key);
    expect(decrypted).toBe(message);
  }, 15000);
});

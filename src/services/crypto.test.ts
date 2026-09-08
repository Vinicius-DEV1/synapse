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

  it('guarantees ciphertext randomness (different IVs for identical plaintext)', async () => {
    const hex = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const key = await importHexKey(hex);
    const text = 'Same message encrypted twice';

    const cipher1 = await encryptText(text, key);
    const cipher2 = await encryptText(text, key);

    expect(cipher1).not.toBe(cipher2);
    expect(await decryptText(cipher1, key)).toBe(text);
    expect(await decryptText(cipher2, key)).toBe(text);
  });

  it('handles multi-byte UTF-8, emojis, and empty strings cleanly', async () => {
    const hex = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
    const key = await importHexKey(hex);

    const unicodeText = '✨ Caderno 2026: 漢字, русский язык, português com acentuação, math: ∑(x²) ≠ ∞ 🚀';
    const cipherUnicode = await encryptText(unicodeText, key);
    expect(await decryptText(cipherUnicode, key)).toBe(unicodeText);

    const emptyText = '';
    const cipherEmpty = await encryptText(emptyText, key);
    expect(await decryptText(cipherEmpty, key)).toBe(emptyText);
  });

  it('rejects tampered ciphertexts with decryption failure', async () => {
    const hex = '99887766554433221100ffeeddccbbaa99887766554433221100ffeeddccbbaa';
    const key = await importHexKey(hex);
    const cipher = await encryptText('Sensitive payload', key);

    // Tamper with ciphertext by altering a base64 character
    const tampered = cipher.slice(0, -4) + 'AAAA';
    await expect(decryptText(tampered, key)).rejects.toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import {
  getVaultKeyHash,
  encryptVaultField,
  decryptVaultField,
} from './vault-crypto';

describe('vault-crypto service', () => {
  it('generates consistent SHA-256 hash for master password', async () => {
    const hash1 = await getVaultKeyHash('my-secret-password');
    const hash2 = await getVaultKeyHash('my-secret-password');
    const hashDifferent = await getVaultKeyHash('different-password');

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDifferent);
    expect(hash1).toHaveLength(64); // 32 bytes in hex = 64 characters
  });

  it('encrypts and decrypts a vault field successfully (IV:Tag:Ciphertext format)', async () => {
    const keyHex = await getVaultKeyHash('masterKey123');
    const secret = 'super-secret-bank-password!@#123';

    const encrypted = await encryptVaultField(secret, keyHex);
    expect(encrypted).toContain(':');
    const parts = encrypted.split(':');
    expect(parts).toHaveLength(3); // ivHex:authTagHex:cipherTextHex

    const decrypted = await decryptVaultField(encrypted, keyHex);
    expect(decrypted).toBe(secret);
  });

  it('returns plaintext safely when decrypting unencrypted strings with colons', async () => {
    const keyHex = await getVaultKeyHash('masterKey123');
    const plaintext = 'https://example.com/login';

    const result = await decryptVaultField(plaintext, keyHex);
    expect(result).toBe(plaintext);
  });
});

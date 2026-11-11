import { describe, it, expect } from 'vitest';
import {
  generateShareId,
  generateShareKey,
  exportShareKeyToBase64,
  importShareKeyFromBase64,
  encryptForShare,
  decryptFromShare,
  encryptBinaryForShare,
  decryptBinaryFromShare,
  generateRandomSalt,
  hashPasswordPBKDF2,
  verifyPasswordHash,
  computeContentHash,
  wrapShareKeyWithMaster,
  unwrapShareKeyWithMaster,
} from './share-crypto';

describe('share-crypto service', () => {
  it('generates a 12-character URL-safe random share ID', () => {
    const id1 = generateShareId();
    const id2 = generateShareId();
    expect(id1).toHaveLength(12);
    expect(id2).toHaveLength(12);
    expect(id1).not.toEqual(id2);
    expect(id1).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('generates and exports/imports an AES-256-GCM CryptoKey', async () => {
    const key = await generateShareKey();
    expect(key.type).toBe('secret');
    expect(key.algorithm.name).toBe('AES-GCM');

    const base64 = await exportShareKeyToBase64(key);
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(16);

    const reimported = await importShareKeyFromBase64(base64);
    expect(reimported.type).toBe('secret');
  });

  it('encrypts and decrypts text with 100% roundtrip fidelity', async () => {
    const key = await generateShareKey();
    const plaintext = '<h1>Confidential Research Note</h1><p>Zero knowledge rocks! 🔐</p>';

    const encrypted = await encryptForShare(plaintext, key);
    expect(encrypted).not.toEqual(plaintext);

    const decrypted = await decryptFromShare(encrypted, key);
    expect(decrypted).toEqual(plaintext);
  });

  it('encrypts and decrypts binary payloads (Yjs updates / blobs)', async () => {
    const key = await generateShareKey();
    const binaryData = new Uint8Array([1, 2, 3, 4, 42, 255, 128, 0, 77]);

    const encrypted = await encryptBinaryForShare(binaryData, key);
    const decrypted = await decryptBinaryFromShare(encrypted, key);

    expect(decrypted).toEqual(binaryData);
  });

  it('hashes passwords using PBKDF2 and verifies valid/invalid inputs', async () => {
    const password = 'SuperSecurePassword2026!';
    const salt = generateRandomSalt();

    const hash = await hashPasswordPBKDF2(password, salt);
    expect(hash).toHaveLength(64); // SHA-256 hex string

    const isMatch = await verifyPasswordHash(password, salt, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPasswordHash('WrongPassword', salt, hash);
    expect(isWrongMatch).toBe(false);
  });

  it('computes deterministic content SHA-256 integrity hash', async () => {
    const text = 'Deterministic page content string';
    const hash1 = await computeContentHash(text);
    const hash2 = await computeContentHash(text);
    const hash3 = await computeContentHash(text + '!');

    expect(hash1).toEqual(hash2);
    expect(hash1).not.toEqual(hash3);
    expect(hash1).toHaveLength(64);
  });

  it('wraps and unwraps a share key with a simulated Master Key', async () => {
    const masterKey = await generateShareKey(); // AES-GCM key simulating master key
    const shareKey = await generateShareKey();

    const wrapped = await wrapShareKeyWithMaster(shareKey, masterKey);
    expect(typeof wrapped).toBe('string');

    const unwrapped = await unwrapShareKeyWithMaster(wrapped, masterKey);

    // Verify unwrapped key encrypts and decrypts identically
    const testText = 'Hello E2EE key wrapping';
    const encrypted = await encryptForShare(testText, unwrapped);
    const decrypted = await decryptFromShare(encrypted, shareKey);
    expect(decrypted).toBe(testText);
  });
});

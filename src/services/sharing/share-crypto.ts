/**
 * @file share-crypto.ts
 * @description Isolated cryptographic engine for Caderno's Page Sharing feature.
 * Enforces Zero-Knowledge isolation: each share possesses its own independent
 * AES-256-GCM key, preventing any blast radius to the user's master key or other notes.
 */

import {
  uint8ArrayToBase64,
  base64ToUint8Array,
  uint8ArrayToHex,
  hexToUint8Array,
} from '../../utils/binary';

const AES_ALGORITHM = 'AES-GCM';
const AES_KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96-bit standard IV for AES-GCM
const PBKDF2_ITERATIONS = 600_000; // NIST SP 800-132 compliant
const URL_SAFE_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Generates a cryptographically random, URL-safe 12-character share identifier.
 * 64^12 = ~4.7e21 entropy, effectively impossible to enumerate.
 */
export function generateShareId(length = 12): string {
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += URL_SAFE_ALPHABET[randomBytes[i] % URL_SAFE_ALPHABET.length];
  }
  return result;
}

/**
 * Generates a fresh, standalone AES-256-GCM symmetric key exclusively for one share.
 */
export async function generateShareKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: AES_ALGORITHM,
      length: AES_KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Exports a share CryptoKey to a raw Base64 string for secure transfer or wrapping.
 */
export async function exportShareKeyToBase64(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return uint8ArrayToBase64(new Uint8Array(raw));
}

/**
 * Imports a raw Base64 string back into an AES-256-GCM CryptoKey.
 */
export async function importShareKeyFromBase64(base64: string): Promise<CryptoKey> {
  const bytes = base64ToUint8Array(base64);
  return await crypto.subtle.importKey(
    'raw',
    bytes as unknown as BufferSource,
    { name: AES_ALGORITHM },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

/**
 * Encrypts a UTF-8 text string using AES-256-GCM.
 * Prepends a unique 12-byte IV to the ciphertext and returns Base64.
 */
export async function encryptForShare(
  plaintext: string,
  shareKey: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: AES_ALGORITHM,
      iv,
    },
    shareKey,
    data
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return uint8ArrayToBase64(combined);
}

/**
 * Decrypts a Base64-encoded [IV || Ciphertext + Tag] string using the share key.
 */
export async function decryptFromShare(
  encryptedBase64: string,
  shareKey: CryptoKey
): Promise<string> {
  const combined = base64ToUint8Array(encryptedBase64);
  if (combined.length < IV_LENGTH + 16) {
    throw new Error('Malformed ciphertext payload: insufficient length');
  }

  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: AES_ALGORITHM,
      iv,
    },
    shareKey,
    data
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypts binary data (such as Yjs Uint8Array updates or media blobs) using AES-256-GCM.
 */
export async function encryptBinaryForShare(
  data: Uint8Array,
  shareKey: CryptoKey
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: AES_ALGORITHM,
      iv,
    },
    shareKey,
    // BufferSource compatibility
    data as unknown as BufferSource
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return uint8ArrayToBase64(combined);
}

/**
 * Decrypts binary data from Base64 [IV || Ciphertext + Tag] using the share key.
 */
export async function decryptBinaryFromShare(
  encryptedBase64: string,
  shareKey: CryptoKey
): Promise<Uint8Array> {
  const combined = base64ToUint8Array(encryptedBase64);
  if (combined.length < IV_LENGTH + 16) {
    throw new Error('Malformed binary ciphertext payload');
  }

  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: AES_ALGORITHM,
      iv,
    },
    shareKey,
    data
  );

  return new Uint8Array(decrypted);
}

/**
 * Generates a cryptographically random 16-byte hex salt for password hashing.
 */
export function generateRandomSalt(): string {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  return uint8ArrayToHex(saltBytes);
}

/**
 * Computes SHA-256 hex digest of any UTF-8 string.
 */
export async function computeSha256Hex(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return uint8ArrayToHex(new Uint8Array(hashBuffer));
}

/**
 * Computes SHA-256 integrity hash for plaintext content verification.
 */
export async function computeContentHash(plaintext: string): Promise<string> {
  return await computeSha256Hex(plaintext);
}

/**
 * Hashes a visitor password using PBKDF2 with SHA-256 and 600,000 iterations.
 */
export async function hashPasswordPBKDF2(
  password: string,
  saltHex: string
): Promise<string> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const saltBytes = hexToUint8Array(saltHex);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as unknown as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    256
  );

  return uint8ArrayToHex(new Uint8Array(derivedBits));
}

/**
 * Constant-time comparison for password hash validation to prevent timing attacks.
 */
export async function verifyPasswordHash(
  candidatePassword: string,
  saltHex: string,
  expectedHashHex: string
): Promise<boolean> {
  const candidateHash = await hashPasswordPBKDF2(candidatePassword, saltHex);
  if (candidateHash.length !== expectedHashHex.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < candidateHash.length; i++) {
    diff |= candidateHash.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Wraps (encrypts) the share key with the owner's Master Key using AES-KW or AES-GCM.
 */
export async function wrapShareKeyWithMaster(
  shareKey: CryptoKey,
  masterKey: CryptoKey
): Promise<string> {
  const shareKeyRaw = await crypto.subtle.exportKey('raw', shareKey);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: AES_ALGORITHM,
      iv,
    },
    masterKey,
    shareKeyRaw
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return uint8ArrayToBase64(combined);
}

/**
 * Unwraps the share key using the owner's Master Key.
 */
export async function unwrapShareKeyWithMaster(
  wrappedBase64: string,
  masterKey: CryptoKey
): Promise<CryptoKey> {
  const combined = base64ToUint8Array(wrappedBase64);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decryptedRaw = await crypto.subtle.decrypt(
    {
      name: AES_ALGORITHM,
      iv,
    },
    masterKey,
    ciphertext
  );

  return await crypto.subtle.importKey(
    'raw',
    decryptedRaw,
    { name: AES_ALGORITHM },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

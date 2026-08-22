import { hexToArrayBuffer, arrayBufferToHex, uint8ArrayToBase64, base64ToUint8Array } from '../utils/binary';

/**
 * End-to-End Encryption (E2EE) Module
 * Utilizes standard Web Crypto API for cryptographic operations.
 */

// Cryptographic parameters for key derivation and encryption
// NOTE: Web salt ('caderno-e2ee-salt-v1') differs from Rust salt ('caderno-keychain-salt').
// Maintained for backward compatibility between Web and Rust cryptographic domains
// (Cloud payloads vs local SQLite databases).
const SALT = new TextEncoder().encode("caderno-e2ee-salt-v1");
const ITERATIONS = 600000;
const HASH_ALGORITHM = 'SHA-256';
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // Standard AES-GCM IV length

/**
 * Derives a Master CryptoKey from user password using PBKDF2 with SHA-256.
 */
export async function deriveMasterKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: ITERATIONS,
      hash: HASH_ALGORITHM
    },
    baseKey,
    { name: ENCRYPTION_ALGORITHM, length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function importHexKey(hexString: string): Promise<CryptoKey> {
  const buffer = hexToArrayBuffer(hexString);
  return crypto.subtle.importKey(
    'raw',
    buffer,
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportKeyToHex(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToHex(exported);
}

/**
 * Encrypts a string using AES-GCM and the provided CryptoKey.
 * Returns a Base64-encoded string combining IV and ciphertext.
 */
export async function encryptText(text: string, masterKey: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // Initialization Vector (IV) MUST be unique per encryption
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv
    },
    masterKey,
    data
  );

  // Combine IV and encrypted data into a single buffer for storage
  const combinedBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combinedBuffer.set(iv, 0);
  combinedBuffer.set(new Uint8Array(encryptedBuffer), iv.length);

  // Convert to Base64 for JSON serialization (e.g. Firebase)
  return uint8ArrayToBase64(combinedBuffer);
}

/**
 * Decrypts a Base64-encoded string containing IV + ciphertext using the provided CryptoKey.
 * Returns the decoded original plaintext.
 */
export async function decryptText(encryptedBase64: string, masterKey: CryptoKey): Promise<string> {
  const combinedBuffer = base64ToUint8Array(encryptedBase64);

  // Extract IV (first IV_LENGTH bytes)
  const iv = combinedBuffer.slice(0, IV_LENGTH);
  const encryptedData = combinedBuffer.slice(IV_LENGTH);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv
    },
    masterKey,
    encryptedData
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}


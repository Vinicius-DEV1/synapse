/**
 * Vault cryptography module for Web runtime.
 * Guarantees exact binary parity with cmd_vault.rs in Desktop (Tauri).
 * Output wire format: iv_hex:auth_tag_hex:encrypted_hex
 */

import { hexToArrayBuffer, arrayBufferToHex } from '../utils/binary';

// Computes SHA-256 hash used as key by Rust (cmd_vault.rs / hash_auth_password)
export async function getVaultKeyHash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'caderno-auth-hash');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hashBuffer);
}

const HEX_REGEX = /^[0-9a-fA-F]+$/;

function isHex(str: string): boolean {
  return str.length > 0 && HEX_REGEX.test(str);
}

export async function encryptVaultField(text: string, keyHex: string): Promise<string> {
  if (text === null || text === undefined || text === '') return text;
  try {
    const keyBuffer = hexToArrayBuffer(keyHex);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Rust backend uses a 12-byte IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      cryptoKey,
      data
    );

    // WebCrypto AES-GCM concatenates Ciphertext + AuthTag (last 16 bytes)
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const authTagBytes = encryptedBytes.slice(-16);
    const cipherTextBytes = encryptedBytes.slice(0, -16);

    const ivHex = arrayBufferToHex(iv.buffer);
    const authTagHex = arrayBufferToHex(authTagBytes.buffer);
    const cipherTextHex = arrayBufferToHex(cipherTextBytes.buffer);

    return `${ivHex}:${authTagHex}:${cipherTextHex}`;
  } catch (e) {
    console.error('[Vault Crypto] Encryption error:', e);
    throw new Error('Failed to encrypt vault field');
  }
}

export async function decryptVaultField(payload: string, keyHex: string): Promise<string> {
  if (!payload || typeof payload !== 'string' || !payload.includes(':')) return payload;
  
  const parts = payload.split(':');
  if (parts.length !== 3) {
    // Graceful fallback for legacy plaintext that happens to contain ':' (e.g. "https://..." or "Note: ...")
    return payload;
  }

  const [ivHex, authTagHex, cipherTextHex] = parts;

  // The wire format requires 12-byte IV (24 hex chars), 16-byte AuthTag (32 hex chars), and hex ciphertext
  if (
    ivHex.length !== 24 ||
    authTagHex.length !== 32 ||
    !isHex(ivHex) ||
    !isHex(authTagHex) ||
    !isHex(cipherTextHex)
  ) {
    // Not valid ciphertext wire format (e.g. URLs with ports or colon-separated text)
    return payload;
  }

  try {
    const keyBuffer = hexToArrayBuffer(keyHex);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const iv = new Uint8Array(hexToArrayBuffer(ivHex));
    const authTag = new Uint8Array(hexToArrayBuffer(authTagHex));
    const cipherText = new Uint8Array(hexToArrayBuffer(cipherTextHex));

    // WebCrypto expects concatenated Ciphertext + AuthTag
    const combined = new Uint8Array(cipherText.length + authTag.length);
    combined.set(cipherText, 0);
    combined.set(authTag, cipherText.length);

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      cryptoKey,
      combined.buffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (e) {
    console.warn('[Vault Crypto] Failed to decrypt vault field, returning as plaintext fallback:', e);
    return payload; // Fallback returning original text on decryption failure
  }
}

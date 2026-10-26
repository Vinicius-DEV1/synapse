/**
 * @file workspace-crypto.ts
 * @description Cryptographic key management for collaborative E2EE workspaces.
 * Generates symmetric workspace keys and wraps them securely per member using PBKDF2/AES-GCM.
 */

import { encryptText, decryptText, exportKeyToHex, importHexKey as importKeyFromHex } from '../crypto';

const AES_KEY_ALGORITHM = { name: 'AES-GCM', length: 256 };

/**
 * Generates a brand new 256-bit symmetric AES-GCM key for a workspace.
 */
export async function generateWorkspaceKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    AES_KEY_ALGORITHM,
    true, // Extractable so it can be wrapped and distributed to authorized members
    ['encrypt', 'decrypt']
  );
}

/**
 * Exports a workspace key to a raw hex string.
 */
export async function exportWorkspaceKey(key: CryptoKey): Promise<string> {
  return await exportKeyToHex(key);
}

/**
 * Imports a hex string back into a CryptoKey instance.
 */
export async function importWorkspaceKey(rawHex: string): Promise<CryptoKey> {
  return await importKeyFromHex(rawHex);
}

/**
 * Encrypts (wraps) a workspace key with a member's personal Master Key.
 * Returns an authenticated ciphertext string safe for Firestore storage.
 */
export async function wrapWorkspaceKeyWithMaster(
  workspaceKey: CryptoKey,
  memberMasterKey: CryptoKey
): Promise<string> {
  const hex = await exportWorkspaceKey(workspaceKey);
  return await encryptText(hex, memberMasterKey);
}

/**
 * Decrypts (unwraps) a workspace key using the member's personal Master Key.
 */
export async function unwrapWorkspaceKeyWithMaster(
  wrappedCiphertext: string,
  memberMasterKey: CryptoKey
): Promise<CryptoKey> {
  const hex = await decryptText(wrappedCiphertext, memberMasterKey);
  return await importWorkspaceKey(hex);
}

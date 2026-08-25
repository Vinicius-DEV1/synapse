/**
 * crypto.ts — API de criptografia do Caderno Mobile
 * 
 * Usa um WebView oculto com crypto.subtle nativo (C++/BoringSSL do Android).
 * Isso é ~100x mais rápido que JavaScript puro no Hermes para PBKDF2.
 */
import { sendToWebView, waitForCryptoReady } from './CryptoWebView';

const SALT_STRING = "caderno-e2ee-salt-v1";
const ITERATIONS = 600000;

export async function deriveMasterKey(password: string): Promise<string> {
  const start = Date.now();
  console.log(`[CRYPTO] ⏳ Derivando PBKDF2 via WebView nativo (${ITERATIONS} iterações)...`);

  await waitForCryptoReady();
  
  const result = await sendToWebView({
    type: 'pbkdf2',
    password,
    salt: SALT_STRING,
    iterations: ITERATIONS,
  });
  
  console.log(`[CRYPTO] ✅ Chave derivada em ${Date.now() - start}ms (nativo C++)!`);
  return result.hexKey;
}

export async function importHexKey(hexString: string): Promise<string> {
  return hexString;
}

export async function exportKeyToHex(key: string): Promise<string> {
  return key;
}

export async function decryptText(encryptedBase64: string, masterKeyHex: string): Promise<string> {
  await waitForCryptoReady();
  const result = await sendToWebView({
    type: 'decrypt',
    keyHex: masterKeyHex,
    cipherBase64: encryptedBase64,
  });
  return result.plaintext;
}

export async function encryptText(text: string, masterKeyHex: string): Promise<string> {
  await waitForCryptoReady();
  const result = await sendToWebView({
    type: 'encrypt',
    keyHex: masterKeyHex,
    plaintext: text,
  });
  return result.cipherBase64;
}

export async function decryptFile(encryptedBuffer: ArrayBuffer, masterKeyHex: string): Promise<ArrayBuffer> {
  await waitForCryptoReady();
  
  // Convert ArrayBuffer to base64
  const bytes = new Uint8Array(encryptedBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const cipherBase64 = btoa(binary);

  const result = await sendToWebView({
    type: 'decryptFile',
    keyHex: masterKeyHex,
    cipherBase64,
  });
  
  // Convert base64 back to ArrayBuffer
  const decoded = atob(result.resultBase64);
  const resultBytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    resultBytes[i] = decoded.charCodeAt(i);
  }
  return resultBytes.buffer as ArrayBuffer;
}

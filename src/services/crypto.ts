/**
 * Módulo de Criptografia de Ponta a Ponta (E2EE)
 * Utiliza Web Crypto API padrão para garantir máxima segurança.
 */

// Parâmetros fixos para a derivação da chave e encriptação
const SALT = new TextEncoder().encode("caderno-e2ee-salt-v1");
const ITERATIONS = 600000;
const HASH_ALGORITHM = 'SHA-256';
const ENCRYPTION_ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // Recomendado para AES-GCM

/**
 * Deriva uma Chave Mestra (CryptoKey) a partir da senha do usuário.
 * Utiliza PBKDF2 para dificultar ataques de força bruta.
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

export async function deriveLegacyMasterKey(password: string): Promise<CryptoKey> {
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
      iterations: 100000,
      hash: HASH_ALGORITHM
    },
    baseKey,
    { name: ENCRYPTION_ALGORITHM, length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function importHexKey(hexString: string): Promise<CryptoKey> {
  const bytes = new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  return await crypto.subtle.importKey(
    'raw',
    bytes,
    { name: ENCRYPTION_ALGORITHM },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encripta um texto (string) usando a Chave Mestra.
 * Retorna uma string base64 combinando o IV e o texto encriptado.
 */
export async function encryptText(text: string, masterKey: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  // O Vetor de Inicialização (IV) DEVE ser único para cada encriptação
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv
    },
    masterKey,
    data
  );

  // Combina o IV e os dados encriptados em um único buffer para armazenar
  const combinedBuffer = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combinedBuffer.set(iv, 0);
  combinedBuffer.set(new Uint8Array(encryptedBuffer), iv.length);

  // Converte para Base64 para facilitar o armazenamento no Firebase (JSON)
  return bufferToBase64(combinedBuffer);
}

/**
 * Desencripta um texto em formato base64 usando a Chave Mestra.
 * Retorna a string original.
 */
export async function decryptText(encryptedBase64: string, masterKey: CryptoKey): Promise<string> {
  const combinedBuffer = base64ToBuffer(encryptedBase64);

  // Extrai o IV (primeiros IV_LENGTH bytes)
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

// === Funções Utilitárias para conversão Base64 / ArrayBuffer ===

function bufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary); // Função global do navegador/electron
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

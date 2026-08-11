/**
 * Criptografia do Cofre para a Web.
 * Garante paridade exata com o formato gerado pelo `cmd_vault.rs` no Desktop.
 * Formato de saída: iv_hex:auth_tag_hex:encrypted_hex
 */

// Gera o hash SHA-256 usado como chave pelo Rust (cmd_vault.rs / hash_auth_password)
export async function getVaultKeyHash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'caderno-auth-hash');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Converte string hex para ArrayBuffer
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer;
}

// Converte ArrayBuffer para string hex
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function encryptVaultField(text: string, keyHex: string): Promise<string> {
  if (!text) return text;
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
    
    // Rust usa IV de 12 bytes
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

    // WebCrypto AES-GCM concatena Ciphertext + AuthTag (últimos 16 bytes)
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const authTagBytes = encryptedBytes.slice(-16);
    const cipherTextBytes = encryptedBytes.slice(0, -16);

    const ivHex = arrayBufferToHex(iv.buffer);
    const authTagHex = arrayBufferToHex(authTagBytes.buffer);
    const cipherTextHex = arrayBufferToHex(cipherTextBytes.buffer);

    return `${ivHex}:${authTagHex}:${cipherTextHex}`;
  } catch (e) {
    console.error("Vault Encryption Error:", e);
    throw new Error("Failed to encrypt vault field");
  }
}

export async function decryptVaultField(payload: string, keyHex: string): Promise<string> {
  if (!payload || !payload.includes(':')) return payload;
  
  const parts = payload.split(':');
  if (parts.length !== 3) return payload; // Não é o formato esperado, retorna original (plaintext legacy)

  try {
    const [ivHex, authTagHex, cipherTextHex] = parts;
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

    // WebCrypto espera Ciphertext + AuthTag concatenados
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
    console.error("Vault Decryption Error:", e);
    return payload; // Fallback para plaintext em caso de erro
  }
}

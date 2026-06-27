import { storage } from './firebase';
import { ref, uploadBytes, getBytes } from 'firebase/storage';

/**
 * Criptografa o arquivo PDF inteiro usando a Master Key
 * Retorna um ArrayBuffer com o conteúdo criptografado.
 */
export async function encryptFile(fileBuffer: ArrayBuffer, masterKey: CryptoKey): Promise<ArrayBuffer> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedContent = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    masterKey,
    fileBuffer
  );

  // Combine IV and Encrypted Content
  const resultBuffer = new Uint8Array(iv.length + encryptedContent.byteLength);
  resultBuffer.set(iv, 0);
  resultBuffer.set(new Uint8Array(encryptedContent), iv.length);
  
  return resultBuffer.buffer;
}

/**
 * Descriptografa um arquivo PDF baixado do Firebase Storage
 */
export async function decryptFile(encryptedBuffer: ArrayBuffer, masterKey: CryptoKey): Promise<ArrayBuffer> {
  const data = new Uint8Array(encryptedBuffer);
  const iv = data.slice(0, 12);
  const content = data.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    masterKey,
    content
  );
  
  return decrypted;
}

/**
 * Faz o upload de um arquivo PDF criptografado para o Firebase Storage
 * Retorna o caminho remoto gerado.
 */
export async function uploadEncryptedPdf(bookId: string, fileBuffer: ArrayBuffer, masterKey: CryptoKey): Promise<string> {
  const encrypted = await encryptFile(fileBuffer, masterKey);
  const remotePath = `library/${bookId}.enc`;
  const fileRef = ref(storage, remotePath);
  
  await uploadBytes(fileRef, encrypted);
  return remotePath;
}

/**
 * Baixa um PDF criptografado do Firebase Storage, descriptografa e retorna
 * um ArrayBuffer para o leitor de PDF (pdf.js).
 */
export async function getDecryptedPdf(remotePath: string, masterKey: CryptoKey): Promise<ArrayBuffer> {
  const fileRef = ref(storage, remotePath);
  
  // Implementa um timeout de 15 segundos para evitar carregamento infinito
  // caso o Firebase Storage não esteja configurado
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('timeout_storage'));
    }, 15000);
  });

  const encryptedBuffer = await Promise.race([
    getBytes(fileRef),
    timeoutPromise
  ]);
  
  return await decryptFile(encryptedBuffer as ArrayBuffer, masterKey);
}


import { getValidAccessToken, uploadToDrive, downloadFromDrive } from './drive';

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
 * Criptografa um arquivo grande por chunks no formato ENC1, usado para vídeos.
 * O formato é:
 * [MAGIC: "ENC1"](4) + [ORIGINAL_SIZE](8) + [CHUNK_SIZE](4)
 * Depois, para cada chunk:
 * [IV](12) + [AES-GCM-Data-With-Auth-Tag](chunk_size + 16)
 * Retorna um Blob para não estourar a memória com arquivos grandes.
 */
export async function encryptFileChunked(file: File | Blob, masterKey: CryptoKey, onProgress?: (p: number) => void): Promise<Blob> {
  const CHUNK_SIZE = 1024 * 1024; // 1MB
  const originalSize = file.size;
  
  // Header: 16 bytes
  const headerBuffer = new ArrayBuffer(16);
  const headerView = new DataView(headerBuffer);
  
  // MAGIC = "ENC1" (0x45, 0x4E, 0x43, 0x31)
  headerView.setUint8(0, 0x45);
  headerView.setUint8(1, 0x4E);
  headerView.setUint8(2, 0x43);
  headerView.setUint8(3, 0x31);
  
  // ORIGINAL_SIZE (8 bytes, Little Endian)
  // JS DataView only has setBigUint64, which is fine
  headerView.setBigUint64(4, BigInt(originalSize), true);
  
  // CHUNK_SIZE (4 bytes, Little Endian)
  headerView.setUint32(12, CHUNK_SIZE, true);
  
  const blobParts: BlobPart[] = [headerBuffer];
  let offset = 0;
  
  while (offset < originalSize) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const chunkBuffer = await chunk.arrayBuffer();
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedContent = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      masterKey,
      chunkBuffer
    );
    
    blobParts.push(iv.buffer);
    blobParts.push(encryptedContent);
    
    offset += CHUNK_SIZE;
    
    if (onProgress) {
      onProgress((offset / originalSize) * 100);
    }
  }
  
  return new Blob(blobParts, { type: 'application/octet-stream' });
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
  
  try {
    const token = await getValidAccessToken();
    if (token) {
      const driveFileId = await uploadToDrive(token, `library_${bookId}.enc`, encrypted);
      return `drive://${driveFileId}`;
    }
  } catch (err) {
    throw err;
  }
}

/**
 * Baixa um PDF criptografado do Firebase Storage, descriptografa e retorna
 * um ArrayBuffer para o leitor de PDF (pdf.js).
 */
export async function getDecryptedPdf(remotePath: string, masterKey: CryptoKey): Promise<ArrayBuffer> {
  let encryptedBuffer: ArrayBuffer;

  if (remotePath.startsWith('drive://')) {
    const fileId = remotePath.replace('drive://', '');
    const token = await getValidAccessToken();
    if (!token) throw new Error('Google Drive não autenticado');
    encryptedBuffer = await downloadFromDrive(token, fileId);
  } else {
    throw new Error('Formato de caminho remoto legado não suportado (Firebase)');
  }
  
  return await decryptFile(encryptedBuffer, masterKey);
}

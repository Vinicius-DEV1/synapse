
import { getValidAccessToken, uploadToDrive, downloadFromDrive } from './drive';

/**
 * Encrypts entire PDF file buffer using the Master Key
 * Returns an ArrayBuffer containing encrypted ciphertext.
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
 * Encrypts large files chunk-by-chunk using ENC1 format (used for video streaming).
 * Wire format:
 * [MAGIC: "ENC1"](4) + [ORIGINAL_SIZE](8) + [CHUNK_SIZE](4)
 * Then, for each chunk:
 * [IV](12) + [AES-GCM-Data-With-Auth-Tag](chunk_size + 16)
 * Returns a Blob to avoid memory exhaustion on large multimedia files.
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
 * Decrypts an encrypted file buffer using the Master Key.
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
 * Decrypts a chunked encrypted Blob (ENC1 format) into a standard Blob.
 */
export async function decryptFileChunked(encryptedBlob: Blob, masterKey: CryptoKey, onProgress?: (p: number) => void): Promise<Blob> {
  const HEADER_SIZE = 16;
  if (encryptedBlob.size < HEADER_SIZE) {
    throw new Error('Invalid encrypted file: too small');
  }

  const headerBuffer = await encryptedBlob.slice(0, HEADER_SIZE).arrayBuffer();
  const headerView = new DataView(headerBuffer);
  
  const m1 = headerView.getUint8(0);
  const m2 = headerView.getUint8(1);
  const m3 = headerView.getUint8(2);
  const m4 = headerView.getUint8(3);
  
  if (m1 !== 0x45 || m2 !== 0x4E || m3 !== 0x43 || m4 !== 0x31) { // "ENC1"
    // Fallback: It might be legacy encryptFile (single chunk, ArrayBuffer)
    const fullBuffer = await encryptedBlob.arrayBuffer();
    const decryptedBuffer = await decryptFile(fullBuffer, masterKey);
    return new Blob([decryptedBuffer]);
  }

  const originalSize = Number(headerView.getBigUint64(4, true));
  const chunkSize = headerView.getUint32(12, true);
  
  const decryptedParts: BlobPart[] = [];
  let offset = HEADER_SIZE;
  const totalEncryptedSize = encryptedBlob.size;
  let processedOriginal = 0;

  while (offset < totalEncryptedSize) {
    // Each chunk is [IV (12)] + [Encrypted Data (chunkSize + 16)]
    // However, the last chunk might be smaller than chunkSize
    // We don't know the exact encrypted chunk size without reading the IV and trying to decrypt the rest,
    // BUT we know AES-GCM adds 16 bytes of auth tag. So encrypted chunk = original chunk + 16.
    
    // Calculate expected original chunk size for this iteration
    const currentOriginalChunkSize = Math.min(chunkSize, originalSize - processedOriginal);
    const expectedEncryptedChunkSize = 12 + currentOriginalChunkSize + 16; // IV + Data + AuthTag
    
    const chunkBlob = encryptedBlob.slice(offset, offset + expectedEncryptedChunkSize);
    const chunkBuffer = await chunkBlob.arrayBuffer();
    
    const chunkData = new Uint8Array(chunkBuffer);
    const iv = chunkData.slice(0, 12);
    const content = chunkData.slice(12);
    
    const decryptedContent = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      masterKey,
      content
    );
    
    decryptedParts.push(decryptedContent);
    processedOriginal += currentOriginalChunkSize;
    offset += expectedEncryptedChunkSize;
    
    if (onProgress) {
      onProgress((offset / totalEncryptedSize) * 100);
    }
  }

  return new Blob(decryptedParts);
}

/**
 * Encrypts and uploads a PDF file to Google Drive.
 * Returns the remote resource URI ('drive://<fileId>').
 */
export async function uploadEncryptedPdf(bookId: string, fileBuffer: ArrayBuffer, masterKey: CryptoKey): Promise<string> {
  const encrypted = await encryptFile(fileBuffer, masterKey);
  
  try {
    const token = await getValidAccessToken();
    if (token) {
      const driveFileId = await uploadToDrive(token, `library_${bookId}.enc`, encrypted);
      return `drive://${driveFileId}`;
    }
    throw new Error('Google Drive não autenticado');
  } catch (err) {
    throw err;
  }
}

/**
 * Downloads and decrypts an encrypted PDF file from Google Drive for pdf.js.
 */
export async function getDecryptedPdf(remotePath: string, masterKey: CryptoKey): Promise<ArrayBuffer> {
  let encryptedBuffer: ArrayBuffer;

  const fileId = remotePath.startsWith('drive://') ? remotePath.replace('drive://', '') : remotePath;
  if (!fileId || fileId.includes('/') || fileId.includes('\\')) {
    throw new Error('Caminho remoto inválido ou legado');
  }

  const token = await getValidAccessToken();
  if (!token) throw new Error('Google Drive não autenticado');
  encryptedBuffer = await downloadFromDrive(token, fileId);

  try {
    return await decryptFile(encryptedBuffer, masterKey);
  } catch {
    // If already decrypted or in another format
    return encryptedBuffer;
  }
}

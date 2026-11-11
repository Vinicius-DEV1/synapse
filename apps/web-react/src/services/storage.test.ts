import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  encryptFile,
  decryptFile,
  encryptFileChunked,
  decryptFileChunked,
  uploadEncryptedPdf,
  getDecryptedPdf,
} from './storage';
import { importHexKey } from './crypto';
import * as drive from './drive';

vi.mock('./drive', () => ({
  getValidAccessToken: vi.fn(),
  uploadToDrive: vi.fn(),
  downloadFromDrive: vi.fn(),
}));

describe('storage service (File E2EE and Chunked Encryption)', () => {
  const testHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  let masterKey: CryptoKey;

  beforeEach(async () => {
    vi.clearAllMocks();
    masterKey = await importHexKey(testHex);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('encrypts and decrypts ArrayBuffer files with AES-GCM and random IV', async () => {
    const originalText = 'Hello Caderno Binary Storage!';
    const originalBuffer = new TextEncoder().encode(originalText).buffer;

    const encryptedBuffer = await encryptFile(originalBuffer, masterKey);
    expect(encryptedBuffer.byteLength).toBeGreaterThan(originalBuffer.byteLength);

    const decryptedBuffer = await decryptFile(encryptedBuffer, masterKey);
    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    expect(decryptedText).toBe(originalText);
  });

  it('encrypts large files in chunks using the ENC1 specification', async () => {
    const content = new Uint8Array(2 * 1024 * 1024); // 2MB dummy payload
    content.fill(42);
    const file = new Blob([content], { type: 'video/mp4' });

    let progressCalls = 0;
    const encryptedBlob = await encryptFileChunked(file, masterKey, (_p) => {
      progressCalls++;
    });

    expect(encryptedBlob.size).toBeGreaterThan(file.size);
    expect(progressCalls).toBeGreaterThan(0);

    // Verify ENC1 Magic Header
    const headerSlice = await encryptedBlob.slice(0, 4).arrayBuffer();
    const magic = new TextDecoder().decode(headerSlice);
    expect(magic).toBe('ENC1');
  });

  it('uploads encrypted PDF and retrieves decrypted buffer from Drive', async () => {
    const dummyPdf = new TextEncoder().encode('%PDF-1.4 Mock PDF Content').buffer;
    vi.mocked(drive.getValidAccessToken).mockResolvedValue('valid_token');
    vi.mocked(drive.uploadToDrive).mockResolvedValue('drive_file_id_999');

    const remotePath = await uploadEncryptedPdf('book_1', dummyPdf, masterKey);
    expect(remotePath).toBe('drive://drive_file_id_999');
    expect(drive.uploadToDrive).toHaveBeenCalled();

    // Now test download & decrypt
    const encryptedMock = await encryptFile(dummyPdf, masterKey);
    vi.mocked(drive.downloadFromDrive).mockResolvedValue(encryptedMock);

    const decryptedPdf = await getDecryptedPdf('drive://drive_file_id_999', masterKey);
    const decryptedString = new TextDecoder().decode(decryptedPdf);
    expect(decryptedString).toBe('%PDF-1.4 Mock PDF Content');
  });

  it('decrypts chunked ENC1 files back to identical original payload', async () => {
    const originalText = 'Hello Chunked World! Testing streaming E2EE decryption.';
    const originalBytes = new TextEncoder().encode(originalText);
    const file = new Blob([originalBytes], { type: 'text/plain' });

    const encryptedBlob = await encryptFileChunked(file, masterKey);
    const decryptedBlob = await decryptFileChunked(encryptedBlob, masterKey);

    const decryptedText = await decryptedBlob.text();
    expect(decryptedText).toBe(originalText);
  });

  it('rejects corrupt ENC1 files with zero chunk size', async () => {
    // Construct header with MAGIC = "ENC1", size = 100, chunkSize = 0
    const headerBuffer = new ArrayBuffer(16);
    const view = new DataView(headerBuffer);
    view.setUint8(0, 0x45); // E
    view.setUint8(1, 0x4E); // N
    view.setUint8(2, 0x43); // C
    view.setUint8(3, 0x31); // 1
    view.setBigUint64(4, 100n, true);
    view.setUint32(12, 0, true); // Zero chunk size

    const corruptBlob = new Blob([headerBuffer, new Uint8Array(32)]);
    await expect(decryptFileChunked(corruptBlob, masterKey)).rejects.toThrow(
      'Invalid encrypted file: chunk size cannot be zero'
    );
  });

  it('rejects encrypted files smaller than header size', async () => {
    const tinyBlob = new Blob([new Uint8Array(8)]);
    await expect(decryptFileChunked(tinyBlob, masterKey)).rejects.toThrow(
      'Invalid encrypted file: too small'
    );
  });
});

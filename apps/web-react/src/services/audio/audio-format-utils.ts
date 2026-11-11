/**
 * Returns the correct MIME type for an audio file based on its extension.
 * Defaults to 'audio/mpeg' for unknown types.
 */
export function getAudioMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase().replace(/\.enc$/, '') ?? '';
  // Strip .enc suffix if present (e.g. "song.mp3.enc" -> check "mp3")
  const cleanExt = filename.replace(/\.enc$/, '').split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    mpeg: 'audio/mpeg',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    opus: 'audio/ogg; codecs=opus',
    wav: 'audio/wav',
    wave: 'audio/wav',
    flac: 'audio/flac',
    m4a: 'audio/mp4',
    m4b: 'audio/mp4',
    aac: 'audio/aac',
    webm: 'audio/webm',
    weba: 'audio/webm',
  };
  return map[cleanExt] ?? map[ext] ?? 'audio/mpeg';
}

/**
 * Checks if a buffer starts with standard audio format magic bytes (MP3, OGG, WAV, FLAC, M4A, WebM).
 */
export function isAudioBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 12));

  // 'ID3' (MP3 ID3v2 tag)
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  // MP3 Sync Word (MPEG audio frame header: 11 bits set: 0xFF followed by 0xEx or 0xFx)
  if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) return true;
  // 'OggS' (Ogg Vorbis / Opus)
  if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return true;
  // 'RIFF' (WAV)
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return true;
  // 'fLaC' (FLAC)
  if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) return true;
  // EBML header (WebM audio)
  if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) return true;
  // MP4 / M4A ('ftyp' at offset 4)
  if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return true;

  return false;
}

/**
 * Checks if a buffer starts with ENC1 encrypted header.
 */
export function isEnc1Buffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer, 0, 4);
  return bytes[0] === 0x45 && bytes[1] === 0x4E && bytes[2] === 0x43 && bytes[3] === 0x31; // 'ENC1'
}

/**
 * Decrypts a buffer fetched from Google Drive into plaintext audio bytes.
 * Handles:
 * 1. Plain unencrypted audio buffers.
 * 2. ENC1 chunked encrypted buffers (with primary & fallback key trial).
 * 3. Legacy single-chunk WebCrypto AES-GCM encrypted buffers.
 */
export async function decryptLofiBufferToPlainAudio(
  buffer: ArrayBuffer,
  masterKey?: CryptoKey,
  fallbackKey?: CryptoKey
): Promise<ArrayBuffer> {
  if (isAudioBuffer(buffer)) {
    return buffer;
  }

  if (masterKey || fallbackKey) {
    const primaryKey = masterKey || fallbackKey!;
    const altKey = masterKey && fallbackKey ? fallbackKey : undefined;

    try {
      const { decryptFileChunked } = await import('../storage');
      const rawBlob = new Blob([buffer]);
      const decryptedBlob = await decryptFileChunked(rawBlob, primaryKey);
      return await decryptedBlob.arrayBuffer();
    } catch (primaryErr) {
      if (altKey) {
        try {
          const { decryptFileChunked } = await import('../storage');
          const rawBlob = new Blob([buffer]);
          const decryptedBlob = await decryptFileChunked(rawBlob, altKey);
          return await decryptedBlob.arrayBuffer();
        } catch (altErr) {
          console.warn('Decryption with fallback key failed', altErr);
        }
      }

      if (!isEnc1Buffer(buffer)) {
        try {
          const { decryptFile } = await import('../storage');
          return await decryptFile(buffer, primaryKey);
        } catch (decryptErr) {
          console.warn('Decryption failed on non-ENC1 buffer, falling back to raw bytes', decryptErr);
          return buffer;
        }
      }

      console.error('Falha ao descriptografar áudio do Lofi (arquivo ENC1):', primaryErr);
      throw new Error('Não foi possível descriptografar a faixa de áudio (chave inválida).', { cause: primaryErr });
    }
  }

  return buffer;
}

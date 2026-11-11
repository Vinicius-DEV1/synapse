import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getAudioMimeType, 
  isAudioBuffer, 
  isEnc1Buffer, 
  getLofiStreamLink,
  decryptLofiBufferToPlainAudio,
  downloadLofiToLocal
} from './lofi-manager';
import * as driveModule from './drive';
import * as storageModule from './storage';
import type { LofiItem } from '../types';

vi.mock('./drive', () => ({
  getValidAccessToken: vi.fn(),
  downloadFromDrive: vi.fn(),
  uploadToDrive: vi.fn(),
  deleteFromDrive: vi.fn(),
}));

describe('lofi-manager service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAudioMimeType', () => {
    it('returns audio/mpeg for mp3 files', () => {
      expect(getAudioMimeType('track.mp3')).toBe('audio/mpeg');
      expect(getAudioMimeType('track.mp3.enc')).toBe('audio/mpeg');
    });

    it('returns audio/ogg for ogg files', () => {
      expect(getAudioMimeType('ambient.ogg')).toBe('audio/ogg');
      expect(getAudioMimeType('ambient.ogg.enc')).toBe('audio/ogg');
    });

    it('returns audio/wav for wav files', () => {
      expect(getAudioMimeType('sound.wav')).toBe('audio/wav');
    });
  });

  describe('isAudioBuffer', () => {
    it('identifies MP3 with ID3 tag', () => {
      const buffer = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]).buffer;
      expect(isAudioBuffer(buffer)).toBe(true);
    });

    it('identifies raw MP3 sync frame', () => {
      const buffer = new Uint8Array([0xFF, 0xFB, 0x90, 0x64]).buffer;
      expect(isAudioBuffer(buffer)).toBe(true);
    });

    it('identifies OggS stream', () => {
      const buffer = new Uint8Array([0x4F, 0x67, 0x67, 0x53, 0x00, 0x02]).buffer;
      expect(isAudioBuffer(buffer)).toBe(true);
    });

    it('identifies RIFF/WAV', () => {
      const buffer = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00]).buffer;
      expect(isAudioBuffer(buffer)).toBe(true);
    });

    it('identifies fLaC', () => {
      const buffer = new Uint8Array([0x66, 0x4C, 0x61, 0x43, 0x00, 0x00]).buffer;
      expect(isAudioBuffer(buffer)).toBe(true);
    });

    it('returns false for encrypted ENC1 header', () => {
      const buffer = new Uint8Array([0x45, 0x4E, 0x43, 0x31, 0x00, 0x00]).buffer;
      expect(isAudioBuffer(buffer)).toBe(false);
    });
  });

  describe('isEnc1Buffer', () => {
    it('detects ENC1 magic bytes', () => {
      const enc1Buffer = new Uint8Array([0x45, 0x4E, 0x43, 0x31, 0x01, 0x02]).buffer;
      expect(isEnc1Buffer(enc1Buffer)).toBe(true);
    });

    it('returns false for non-ENC1 buffers', () => {
      const mp3Buffer = new Uint8Array([0x49, 0x44, 0x33, 0x03]).buffer;
      expect(isEnc1Buffer(mp3Buffer)).toBe(false);
    });
  });

  describe('decryptLofiBufferToPlainAudio', () => {
    const dummyKey = {} as CryptoKey;

    it('returns unencrypted buffer directly when it is valid audio', async () => {
      const mp3Buffer = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]).buffer;
      const result = await decryptLofiBufferToPlainAudio(mp3Buffer, dummyKey);
      expect(result).toBe(mp3Buffer);
    });

    it('decrypts chunked ENC1 buffer using primary key', async () => {
      const enc1Buffer = new Uint8Array([0x45, 0x4E, 0x43, 0x31, 0x00, 0x00]).buffer;
      const decryptedMockBlob = new Blob(['plain-audio-bytes']);
      vi.spyOn(storageModule, 'decryptFileChunked').mockResolvedValue(decryptedMockBlob);

      const result = await decryptLofiBufferToPlainAudio(enc1Buffer, dummyKey);
      const str = new TextDecoder().decode(result);
      expect(str).toBe('plain-audio-bytes');
    });
  });

  describe('getLofiStreamLink', () => {
    const dummyKey = {} as CryptoKey;

    it('returns blob URL directly without decryption when downloaded buffer is plain audio', async () => {
      vi.spyOn(driveModule, 'getValidAccessToken').mockResolvedValue('valid-token');
      const mp3Buffer = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00]).buffer;
      vi.spyOn(driveModule, 'downloadFromDrive').mockResolvedValue(mp3Buffer);

      const url = await getLofiStreamLink('drive-file-123', dummyKey, 'lofi.mp3');
      expect(url).toContain('blob:');
      expect(driveModule.downloadFromDrive).toHaveBeenCalledWith('valid-token', 'drive-file-123');
    });

    it('decrypts with decryptFileChunked when buffer is ENC1 format', async () => {
      vi.spyOn(driveModule, 'getValidAccessToken').mockResolvedValue('valid-token');
      const enc1Buffer = new Uint8Array([0x45, 0x4E, 0x43, 0x31, 0x00, 0x00, 0x00, 0x00]).buffer;
      vi.spyOn(driveModule, 'downloadFromDrive').mockResolvedValue(enc1Buffer);

      vi.spyOn(storageModule, 'decryptFileChunked').mockResolvedValue(new Blob(['decrypted-audio-data']));

      const url = await getLofiStreamLink('drive-file-enc', dummyKey, 'lofi.mp3');
      expect(url).toContain('blob:');
      expect(storageModule.decryptFileChunked).toHaveBeenCalled();
    });
  });

  describe('downloadLofiToLocal', () => {
    const dummyKey = {} as CryptoKey;
    const mockLofi: LofiItem = {
      id: 'lofi-1',
      title: 'Rainy Night',
      original_name: 'rain.mp3',
      drive_file_id: 'drive-rain-123',
      is_local: false,
      duration: 120,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('throws error if not in Desktop environment', async () => {
      (window as any).api = undefined;
      await expect(downloadLofiToLocal(mockLofi)).rejects.toThrow('Download local só está disponível no ambiente Desktop.');
    });

    it('downloads using native stream downloadFromDrive when available and reports progress', async () => {
      const downloadFromDriveMock = vi.fn().mockResolvedValue('/app_data/lofi/rain.mp3.enc');
      let progressCb: ((payload: { driveId: string; percent: number }) => void) | undefined;
      const onDownloadProgressMock = vi.fn().mockImplementation((cb) => {
        progressCb = cb;
        return () => {};
      });
      const upsertRowMock = vi.fn().mockResolvedValue(undefined);

      (window as any).api = {
        lofi: {
          downloadFromDrive: downloadFromDriveMock,
          onDownloadProgress: onDownloadProgressMock,
        },
        sync: { upsertRow: upsertRowMock },
      };

      vi.spyOn(driveModule, 'getValidAccessToken').mockResolvedValue('valid-drive-token');
      const onProgress = vi.fn();

      const localPath = await downloadLofiToLocal(mockLofi, onProgress, dummyKey);
      expect(localPath).toBe('/app_data/lofi/rain.mp3.enc');
      expect(downloadFromDriveMock).toHaveBeenCalledWith('drive-rain-123', 'valid-drive-token', 'rain.mp3');

      // Test progress reporting
      if (progressCb) {
        progressCb({ driveId: 'drive-rain-123', percent: 75 });
        expect(onProgress).toHaveBeenCalledWith(75);
      }

      expect(upsertRowMock).toHaveBeenCalledWith('lofis', expect.objectContaining({
        id: 'lofi-1',
        is_local: true,
        file_path: '/app_data/lofi/rain.mp3.enc',
      }));
    });

    it('downloads from drive, saves locally, and updates sync row when native stream is absent', async () => {
      const saveLocalMock = vi.fn().mockResolvedValue('/app_data/lofi/rain.mp3.enc');
      const upsertRowMock = vi.fn().mockResolvedValue(undefined);
      (window as any).api = {
        lofi: { saveLocal: saveLocalMock },
        sync: { upsertRow: upsertRowMock },
      };

      vi.spyOn(driveModule, 'getValidAccessToken').mockResolvedValue('valid-drive-token');
      const mp3Buffer = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0x00, 0x00]).buffer;
      vi.spyOn(driveModule, 'downloadFromDrive').mockResolvedValue(mp3Buffer);

      const localPath = await downloadLofiToLocal(mockLofi, undefined, dummyKey);
      expect(localPath).toBe('/app_data/lofi/rain.mp3.enc');
      expect(saveLocalMock).toHaveBeenCalledWith('rain.mp3', mp3Buffer);
      expect(upsertRowMock).toHaveBeenCalledWith('lofis', expect.objectContaining({
        id: 'lofi-1',
        is_local: true,
        file_path: '/app_data/lofi/rain.mp3.enc',
      }));
    });
  });
});

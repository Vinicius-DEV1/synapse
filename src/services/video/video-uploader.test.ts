import { describe, it, expect, vi, beforeEach } from 'vitest';
import { uploadLocalFileToDrive, uploadNewVideo } from './video-uploader';
import * as driveService from '../drive';

vi.mock('../drive', () => ({
  getValidAccessToken: vi.fn(),
  uploadToDrive: vi.fn(),
  deleteFromDrive: vi.fn(),
  getOrCreateAppFolder: vi.fn(),
}));

describe('video-uploader Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws an error immediately if signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      uploadNewVideo({
        videoFile: new File(['mock content'], 'test.mp4', { type: 'video/mp4' }),
        signal: controller.signal,
      } as any)
    ).rejects.toThrow(/Cancelado pelo usuário/i);
  });

  it('delegates to window.api.video.uploadFileToDrive when native api is available', async () => {
    vi.mocked(driveService.getOrCreateAppFolder).mockResolvedValue('app_folder_id');

    (window as any).api = {
      video: {
        uploadFileToDrive: vi.fn().mockResolvedValue({ id: 'file_drive_id_123' }),
      },
    };

    const result = await uploadLocalFileToDrive(
      'token_abc',
      '/path/to/video.mp4',
      'video_remote.mp4'
    );

    expect(window.api.video.uploadFileToDrive).toHaveBeenCalledWith(
      '/path/to/video.mp4',
      'video_remote.mp4',
      'app_folder_id',
      'token_abc'
    );
    expect(result).toEqual({ id: 'file_drive_id_123' });
  });
});

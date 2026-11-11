import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteVideoAndSync } from './video-cleaner';
import type { VideoItem } from '../../types';
import * as drive from '../drive';

describe('video-cleaner service', () => {
  beforeEach(() => {
    (window as any).api = {
      video: {
        deleteLocal: vi.fn().mockResolvedValue(undefined),
      },
      sync: {
        getTable: vi.fn().mockResolvedValue([]),
        upsertRow: vi.fn().mockResolvedValue(undefined),
      },
    };
    vi.spyOn(drive, 'getValidAccessToken').mockResolvedValue('fake-drive-token');
    vi.spyOn(drive, 'deleteFromDrive').mockResolvedValue(undefined);
  });

  it('deletes local file, Drive files and soft-deletes database record', async () => {
    const video: VideoItem = {
      id: 'vid-1',
      title: 'Math Lecture',
      original_name: 'lecture.mp4',
      is_local: true,
      drive_file_id: 'drive-main-123',
      drive_web_file_id: 'drive-web-456',
      audio_tracks_json: JSON.stringify([{ drive_id: 'audio-track-789' }]),
      subtitles_json: JSON.stringify([{ drive_id: 'sub-track-101' }]),
    } as any;

    await deleteVideoAndSync(video);

    expect((window as any).api.video.deleteLocal).toHaveBeenCalledWith('lecture.mp4');
    expect(drive.deleteFromDrive).toHaveBeenCalledWith('fake-drive-token', 'drive-main-123');
    expect(drive.deleteFromDrive).toHaveBeenCalledWith('fake-drive-token', 'drive-web-456');
    expect(drive.deleteFromDrive).toHaveBeenCalledWith('fake-drive-token', 'audio-track-789');
    expect(drive.deleteFromDrive).toHaveBeenCalledWith('fake-drive-token', 'sub-track-101');

    expect((window as any).api.sync.upsertRow).toHaveBeenCalledWith(
      'videos',
      expect.objectContaining({
        id: 'vid-1',
        deleted_at: expect.any(String),
      })
    );
  });
});

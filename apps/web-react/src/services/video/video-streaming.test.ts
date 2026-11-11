import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveVideoUrl, getVideoStreamLink } from './video-streaming';
import type { VideoItem } from '../../types';

vi.mock('../drive', () => ({
  getValidAccessToken: vi.fn().mockResolvedValue('fake-token-123'),
  downloadFromDrive: vi.fn().mockResolvedValue(new ArrayBuffer(16))
}));

vi.mock('../../utils/settings', () => ({
  getSettings: vi.fn().mockReturnValue({ videoPlaybackPreference: 'auto' })
}));

describe('video-streaming service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).api;
  });

  const mockVideo: VideoItem = {
    id: 'vid-1',
    title: 'Test Video',
    original_name: 'test.mp4',
    duration: 120,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_local: false,
    drive_file_id: 'drive-123'
  };

  it('resolves web streaming link for remote video when api is not available', async () => {
    const url = await resolveVideoUrl(mockVideo);
    expect(url).toBe('/stream-video/drive-123');
  });

  it('resolves stream link from drive via getVideoStreamLink', async () => {
    const link = await getVideoStreamLink('drive-123');
    expect(link).toContain('fake-token-123');
    expect(link).toContain('drive-123');
  });

  it('throws error when no drive id and no local path', async () => {
    const emptyVideo: VideoItem = {
      ...mockVideo,
      drive_file_id: undefined,
      drive_web_file_id: undefined
    };
    await expect(resolveVideoUrl(emptyVideo)).rejects.toThrow();
  });
});

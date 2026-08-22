import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFFmpeg, processVideoWeb } from './ffmpeg-web';

vi.mock('@ffmpeg/ffmpeg', () => {
  class MockFFmpeg {
    load = vi.fn().mockResolvedValue(undefined);
    on = vi.fn();
    writeFile = vi.fn().mockResolvedValue(undefined);
    readFile = vi.fn().mockResolvedValue(new Uint8Array([0, 1, 2, 3]));
    exec = vi.fn().mockResolvedValue(0);
    deleteFile = vi.fn().mockResolvedValue(undefined);
    terminate = vi.fn();
  }
  return { FFmpeg: MockFFmpeg };
});

vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn().mockResolvedValue(new Uint8Array([10, 20, 30])),
}));

describe('ffmpeg-web service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads FFmpeg WASM core once on singleton initialization', async () => {
    const ffmpeg1 = await getFFmpeg();
    const ffmpeg2 = await getFFmpeg();

    expect(ffmpeg1).toBe(ffmpeg2);
    expect(ffmpeg1.load).toHaveBeenCalled();
  });

  it('returns original blob without transcoding when quality is original', async () => {
    const originalBlob = new Blob(['video-data'], { type: 'video/mp4' });
    const onProgress = vi.fn();

    const result = await processVideoWeb(originalBlob, 'original', 'fast', onProgress);
    expect(result).toBe(originalBlob);
  });

  it('transcodes video with selected quality and cleans up memory files', async () => {
    const originalBlob = new Blob(['video-data'], { type: 'video/mp4' });
    const onProgress = vi.fn();

    const result = await processVideoWeb(originalBlob, '720p', 'faster', onProgress);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('video/mp4');

    const ffmpegInstance = await getFFmpeg();
    expect(ffmpegInstance.writeFile).toHaveBeenCalled();
    expect(ffmpegInstance.exec).toHaveBeenCalledWith(
      expect.arrayContaining(['-i', 'input.mp4', '-preset', 'faster', 'output.mp4'])
    );
    expect(ffmpegInstance.deleteFile).toHaveBeenCalledWith('input.mp4');
    expect(ffmpegInstance.deleteFile).toHaveBeenCalledWith('output.mp4');
  });
});

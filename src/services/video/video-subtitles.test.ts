import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attachSubtitleToVideo, removeSubtitleFromVideo, renameSubtitleInVideo, getSubtitleText } from './video-subtitles';
import type { VideoItem } from '../../types';
import * as drive from '../drive';

describe('video-subtitles service', () => {
  beforeEach(() => {
    (window as any).api = {
      video: {
        saveLocal: vi.fn().mockResolvedValue(undefined),
        getLocalPath: vi.fn().mockImplementation((name: string) => `/mock/path/${name}`),
        deleteLocal: vi.fn().mockResolvedValue(undefined),
        readLocalFile: vi.fn().mockResolvedValue(new TextEncoder().encode('WEBVTT\n\n1\n00:00:01.000 --> 00:00:03.000\nHello World')),
      },
      sync: {
        upsertRow: vi.fn().mockResolvedValue(undefined),
      },
    };
    vi.spyOn(drive, 'getValidAccessToken').mockResolvedValue('fake-token');
    vi.spyOn(drive, 'uploadToDrive').mockResolvedValue('drive-sub-123');
    vi.spyOn(drive, 'deleteFromDrive').mockResolvedValue(undefined);
  });

  it('attaches a new SRT subtitle to a video item converting it to WebVTT', async () => {
    const srtContent = '1\n00:00:01,000 --> 00:00:03,000\nOlá Mundo\n';
    const subFile = new File([srtContent], 'portugues.srt', { type: 'text/plain' });

    const video: VideoItem = {
      id: 'vid-123',
      title: 'Aula de Espanhol',
      original_name: 'aula.mp4',
      subtitles_json: JSON.stringify([{ id: 'sub_0', label: 'Legenda Original' }]),
    } as any;

    const { updatedVideo, newTrack } = await attachSubtitleToVideo(video, subFile, 'Português (BR)');

    expect(newTrack.label).toBe('Português (BR)');
    expect(newTrack.drive_id).toBe('drive-sub-123');
    expect(newTrack.local_path).toContain('vid-123_');

    const parsedSubs = JSON.parse(updatedVideo.subtitles_json || '[]');
    expect(parsedSubs).toHaveLength(2);
    expect(parsedSubs[1].label).toBe('Português (BR)');

    expect((window as any).api.sync.upsertRow).toHaveBeenCalledWith('videos', expect.objectContaining({
      id: 'vid-123',
      subtitles_json: expect.any(String),
    }));
  });

  it('removes a subtitle track and cleans up local storage', async () => {
    const video: VideoItem = {
      id: 'vid-123',
      title: 'Aula de Espanhol',
      original_name: 'aula.mp4',
      subtitles_json: JSON.stringify([
        { id: 'sub_1', label: 'Espanhol', local_path: '/path/to/vid-123_sub_1.vtt.enc', drive_id: 'drive-sub-1' },
        { id: 'sub_2', label: 'Inglês', local_path: '/path/to/vid-123_sub_2.vtt.enc', drive_id: 'drive-sub-2' },
      ]),
    } as any;

    const updatedVideo = await removeSubtitleFromVideo(video, 'sub_1');

    expect((window as any).api.video.deleteLocal).toHaveBeenCalledWith('vid-123_sub_1.vtt.enc');
    expect(drive.deleteFromDrive).toHaveBeenCalledWith('fake-token', 'drive-sub-1');

    const parsedSubs = JSON.parse(updatedVideo.subtitles_json || '[]');
    expect(parsedSubs).toHaveLength(1);
    expect(parsedSubs[0].id).toBe('sub_2');
  });

  it('renames an existing subtitle track', async () => {
    const video: VideoItem = {
      id: 'vid-123',
      title: 'Aula de Espanhol',
      original_name: 'aula.mp4',
      subtitles_json: JSON.stringify([
        { id: 'sub_1', label: 'Legenda 0:s:0' },
      ]),
    } as any;

    const updatedVideo = await renameSubtitleInVideo(video, 'sub_1', 'Espanhol Europeu');

    const parsedSubs = JSON.parse(updatedVideo.subtitles_json || '[]');
    expect(parsedSubs[0].label).toBe('Espanhol Europeu');
  });

  it('loads subtitle text from local path', async () => {
    const content = await getSubtitleText(undefined, '/mock/path/sub.vtt');
    expect(content).toContain('Hello World');
  });
});

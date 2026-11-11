import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchLinkMetadata } from './fetchLinkMetadata';
import { formatDate, formatSingleDate } from './youtubeUtils';

describe('fetchLinkMetadata service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches YouTube oEmbed metadata when URL is a youtube link', async () => {
    const mockOEmbed = {
      title: 'Aprenda TypeScript em 10 Minutos',
      author_name: 'Dev Channel',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOEmbed,
    } as Response);

    const meta = await fetchLinkMetadata('https://www.youtube.com/watch?v=abc123xyz');
    expect(meta.title).toBe('Aprenda TypeScript em 10 Minutos');
    expect(meta.channel).toBe('Dev Channel');
  });

  it('extracts playlist metadata including playlistCount and date ranges from yt-dlp API', async () => {
    (window as any).api = {
      youtube: {
        fetchPlaylistInfo: vi.fn().mockResolvedValue({
          _type: 'playlist',
          title: 'Curso Completo de Algoritmos',
          uploader: 'Professor Silva',
          playlist_count: 24,
          entries: [
            { id: 'vid1', title: 'Aula 1', upload_date: '20210310' },
            { id: 'vid2', title: 'Aula 2', upload_date: '20220615' },
            { id: 'vid3', title: 'Aula 3', upload_date: '20231120' },
          ],
        }),
      },
    };

    const meta = await fetchLinkMetadata('https://www.youtube.com/playlist?list=PL123456');
    expect(meta.title).toBe('Curso Completo de Algoritmos');
    expect(meta.channel).toBe('Professor Silva');
    expect(meta.isPlaylist).toBe(true);
    expect(meta.playlistCount).toBe(24);
    expect(meta.uploadDate).toBe('20210310 - 20231120');

    delete (window as any).api;
  });

  it('falls back to hostname when all proxy providers fail', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'));

    const meta = await fetchLinkMetadata('https://antigravity.google.com/docs');
    expect(meta.title).toBe('antigravity.google.com');
  });
});

describe('youtubeUtils date formatting', () => {
  it('formats single 8-digit date correctly', () => {
    expect(formatSingleDate('20230510')).toBe('10/05/2023');
    expect(formatDate('20230510')).toBe('10/05/2023');
  });

  it('formats ISO single date correctly', () => {
    expect(formatSingleDate('2023-05-10')).toBe('10/05/2023');
    expect(formatDate('2023-05-10')).toBe('10/05/2023');
  });

  it('formats date range correctly', () => {
    expect(formatDate('20210310 - 20231120')).toBe('10/03/2021 – 20/11/2023');
    expect(formatDate('2021-03-10 - 2023-11-20')).toBe('10/03/2021 – 20/11/2023');
  });

  it('returns single date if start and end in range are identical', () => {
    expect(formatDate('20230510 - 20230510')).toBe('10/05/2023');
  });
});


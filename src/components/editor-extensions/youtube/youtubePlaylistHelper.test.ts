import { describe, it, expect } from 'vitest';
import { isMembersOnlyVideo, formatVideoReleaseDate } from './youtubePlaylistHelper';

describe('youtubePlaylistHelper', () => {
  describe('isMembersOnlyVideo', () => {
    it('returns true when availability is subscriber_only', () => {
      expect(isMembersOnlyVideo({ availability: 'subscriber_only' })).toBe(true);
      expect(isMembersOnlyVideo({ availability: 'SUBSCRIBER_ONLY' })).toBe(true);
    });

    it('returns true when availability is premium_only or needs_auth', () => {
      expect(isMembersOnlyVideo({ availability: 'premium_only' })).toBe(true);
      expect(isMembersOnlyVideo({ availability: 'needs_auth' })).toBe(true);
    });

    it('returns true when title contains members markers', () => {
      expect(isMembersOnlyVideo({ title: 'Aula Especial [Membros] - C# Avançado' })).toBe(true);
      expect(isMembersOnlyVideo({ title: 'Live (membros) - Tirando dúvidas' })).toBe(true);
      expect(isMembersOnlyVideo({ title: 'Conteúdo exclusivo para membros' })).toBe(true);
    });

    it('returns false for regular public or unlisted videos', () => {
      expect(isMembersOnlyVideo({ availability: 'public', title: 'Vídeo Aberto' })).toBe(false);
      expect(isMembersOnlyVideo({ availability: 'unlisted', title: 'Vídeo Não Listado' })).toBe(false);
      expect(isMembersOnlyVideo(null)).toBe(false);
      expect(isMembersOnlyVideo({})).toBe(false);
    });
  });

  describe('formatVideoReleaseDate', () => {
    it('formats Unix timestamp in seconds to DD/MM/YYYY', () => {
      // 1715731200 -> May 15, 2024
      const d = new Date(2024, 4, 15);
      const timestamp = Math.floor(d.getTime() / 1000);
      expect(formatVideoReleaseDate(timestamp)).toBe('15/05/2024');
    });

    it('formats YYYYMMDD string from yt-dlp to DD/MM/YYYY', () => {
      expect(formatVideoReleaseDate(null, '20240515')).toBe('15/05/2024');
      expect(formatVideoReleaseDate(undefined, '20231201')).toBe('01/12/2023');
    });

    it('formats ISO date string to DD/MM/YYYY', () => {
      expect(formatVideoReleaseDate(null, '2024-05-15T12:00:00Z')).toBe('15/05/2024');
    });

    it('returns empty string when no date is provided or date is invalid', () => {
      expect(formatVideoReleaseDate(null, null)).toBe('');
      expect(formatVideoReleaseDate(undefined, undefined)).toBe('');
      expect(formatVideoReleaseDate(0, '')).toBe('');
      expect(formatVideoReleaseDate(null, 'invalid-date')).toBe('');
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CultureTrailerService,
  extractYoutubeId,
  getYoutubeWatchUrl,
  getYoutubeEmbedUrl,
  getYoutubeSearchUrl,
} from './culture-trailer';
import * as cultureApis from './culture-apis';

describe('CultureTrailerService', () => {
  beforeEach(() => {
    CultureTrailerService.clearCache();
    vi.restoreAllMocks();
  });

  describe('extractYoutubeId', () => {
    it('returns valid 11-char ID directly', () => {
      expect(extractYoutubeId('cdx31ak4KbQ')).toBe('cdx31ak4KbQ');
    });

    it('extracts ID from standard watch URL', () => {
      expect(extractYoutubeId('https://www.youtube.com/watch?v=cdx31ak4KbQ')).toBe('cdx31ak4KbQ');
    });

    it('extracts ID from youtu.be short URL', () => {
      expect(extractYoutubeId('https://youtu.be/cdx31ak4KbQ')).toBe('cdx31ak4KbQ');
    });

    it('returns null for non-youtube strings', () => {
      expect(extractYoutubeId('not-a-link')).toBeNull();
      expect(extractYoutubeId(undefined)).toBeNull();
    });
  });

  describe('url generators', () => {
    it('generates standard watch URL', () => {
      expect(getYoutubeWatchUrl('abc12345678')).toBe('https://www.youtube.com/watch?v=abc12345678');
    });

    it('generates privacy-friendly embed URL', () => {
      const url = getYoutubeEmbedUrl('abc12345678', true);
      expect(url).toContain('https://www.youtube-nocookie.com/embed/abc12345678?rel=0&autoplay=1');
    });

    it('generates YouTube search fallback query', () => {
      const url = getYoutubeSearchUrl('Oppenheimer', 'filme');
      expect(url).toContain('search_query=Oppenheimer%20trailer%20oficial');
    });
  });

  describe('resolveTrailer', () => {
    it('resolves immediately from direct trailer_yt_id without API call', async () => {
      const apiSpy = vi.spyOn(cultureApis, 'fetchCinemetaMetadata');
      const trailer = await CultureTrailerService.resolveTrailer({
        title: 'Inception',
        type: 'filme',
        trailer_yt_id: 'cdx31ak4KbQ',
      });

      expect(trailer).not.toBeNull();
      expect(trailer?.youtubeId).toBe('cdx31ak4KbQ');
      expect(trailer?.source).toBe('direct');
      expect(apiSpy).not.toHaveBeenCalled();
    });

    it('resolves immediately from trailer_url', async () => {
      const trailer = await CultureTrailerService.resolveTrailer({
        title: 'Interstellar',
        type: 'filme',
        trailer_url: 'https://www.youtube.com/watch?v=LY19rHKAaAg',
      });

      expect(trailer?.youtubeId).toBe('LY19rHKAaAg');
      expect(trailer?.source).toBe('direct');
    });

    it('resolves via Cinemeta when IMDb ID is present', async () => {
      vi.spyOn(cultureApis, 'fetchCinemetaMetadata').mockResolvedValue({
        trailer_yt_id: 'qiuSBWVdgLI',
        trailer_url: 'https://www.youtube.com/watch?v=qiuSBWVdgLI',
      });

      const trailer = await CultureTrailerService.resolveTrailer({
        title: 'Oppenheimer',
        type: 'filme',
        api_id: 'tt15398776',
        api_source: 'imdb',
      });

      expect(trailer?.youtubeId).toBe('qiuSBWVdgLI');
      expect(trailer?.source).toBe('cinemeta');
    });

    it('resolves via IMDb autosuggest and Cinemeta when no ID exists', async () => {
      vi.spyOn(cultureApis, 'fetchImdbMovies').mockResolvedValue([
        {
          title: 'Severance',
          api_id: 'tt11280740',
          api_source: 'imdb',
          type: 'filme',
          synopsis: '',
          cover: '',
          total: 0,
        },
      ]);

      vi.spyOn(cultureApis, 'fetchCinemetaMetadata').mockResolvedValue({
        trailer_yt_id: 'xEQP4VVuyrY',
      });

      const trailer = await CultureTrailerService.resolveTrailer({
        title: 'Severance',
        type: 'filme',
      });

      expect(trailer?.youtubeId).toBe('xEQP4VVuyrY');
      expect(trailer?.source).toBe('imdb');
    });

    it('caches the result in memory for fast repeat lookups', async () => {
      const cinemetaSpy = vi.spyOn(cultureApis, 'fetchCinemetaMetadata').mockResolvedValue({
        trailer_yt_id: 'cdx31ak4KbQ',
      });

      const first = await CultureTrailerService.resolveTrailer({
        title: 'Inception',
        type: 'filme',
        api_id: 'tt1375666',
      });

      const second = await CultureTrailerService.resolveTrailer({
        title: 'Inception',
        type: 'filme',
        api_id: 'tt1375666',
      });

      expect(first?.youtubeId).toBe('cdx31ak4KbQ');
      expect(second?.youtubeId).toBe('cdx31ak4KbQ');
      expect(cinemetaSpy).toHaveBeenCalledTimes(1); // Cached on 2nd call
    });
  });
});

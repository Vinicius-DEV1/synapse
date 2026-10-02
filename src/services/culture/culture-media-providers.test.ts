import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchOpenLibraryBooks,
  fetchAniListMedia,
  fetchKitsuManga,
} from './culture-media-providers';

describe('culture-media-providers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchOpenLibraryBooks', () => {
    it('returns formatted results with high-resolution cover URLs', async () => {
      const mockOlResponse = {
        docs: [
          {
            title: 'Neuromancer',
            cover_i: 283860,
            number_of_pages_median: 271,
            first_publish_year: 1984,
            key: '/works/OL14983262W',
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOlResponse,
      } as Response);

      const results = await fetchOpenLibraryBooks('Neuromancer');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Neuromancer');
      expect(results[0].cover).toBe('https://covers.openlibrary.org/b/id/283860-L.jpg');
      expect(results[0].api_source).toBe('openlibrary');
      expect(results[0].type).toBe('livro');
    });

    it('returns empty array on network failure without throwing', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const results = await fetchOpenLibraryBooks('UnknownBookXYZ');
      expect(results).toEqual([]);
    });
  });

  describe('fetchAniListMedia', () => {
    it('returns manga covers from AniList GraphQL', async () => {
      const mockAniResponse = {
        data: {
          Page: {
            media: [
              {
                id: 30002,
                title: { userPreferred: 'Berserk', english: 'Berserk' },
                coverImage: {
                  extraLarge: 'https://s4.anilist.co/berserk-xl.jpg',
                  large: 'https://s4.anilist.co/berserk-l.jpg',
                },
                description: 'A dark fantasy masterpiece.',
                status: 'RELEASING',
                chapters: 375,
                volumes: 42,
                startDate: { year: 1989 },
              },
            ],
          },
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAniResponse,
      } as Response);

      const results = await fetchAniListMedia('Berserk', 'MANGA');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Berserk');
      expect(results[0].cover).toBe('https://s4.anilist.co/berserk-xl.jpg');
      expect(results[0].api_source).toBe('anilist');
      expect(results[0].type).toBe('manga');
    });

    it('returns anime covers from AniList GraphQL', async () => {
      const mockAniResponse = {
        data: {
          Page: {
            media: [
              {
                id: 154587,
                title: { userPreferred: 'Sousou no Frieren', english: "Frieren: Beyond Journey's End" },
                coverImage: {
                  large: 'https://s4.anilist.co/frieren-l.jpg',
                },
                description: 'After the demon king was defeated...',
                status: 'FINISHED',
                episodes: 28,
                startDate: { year: 2023 },
              },
            ],
          },
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockAniResponse,
      } as Response);

      const results = await fetchAniListMedia('Frieren', 'ANIME');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Sousou no Frieren');
      expect(results[0].cover).toBe('https://s4.anilist.co/frieren-l.jpg');
      expect(results[0].api_source).toBe('anilist');
      expect(results[0].type).toBe('anime');
    });
  });

  describe('fetchKitsuManga', () => {
    it('returns manga covers from Kitsu API', async () => {
      const mockKitsuResponse = {
        data: [
          {
            id: '54139',
            attributes: {
              canonicalTitle: 'Chainsaw Man',
              synopsis: 'Denji has a simple dream...',
              posterImage: {
                large: 'https://media.kitsu.app/chainsaw-man.jpg',
              },
              chapterCount: 150,
              startDate: '2018-12-03',
              status: 'current',
            },
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockKitsuResponse,
      } as Response);

      const results = await fetchKitsuManga('Chainsaw Man');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Chainsaw Man');
      expect(results[0].cover).toBe('https://media.kitsu.app/chainsaw-man.jpg');
      expect(results[0].api_source).toBe('kitsu');
    });
  });
});

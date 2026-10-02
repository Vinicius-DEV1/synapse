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
    it('returns formatted results with high-resolution cover URLs and rich metadata', async () => {
      const mockOlResponse = {
        docs: [
          {
            title: 'Neuromancer',
            cover_i: 283860,
            number_of_pages_median: 271,
            first_publish_year: 1984,
            key: '/works/OL14983262W',
            ratings_average: 4.24,
            publisher: ['Ace Books'],
            author_name: ['William Gibson'],
            subject: ['Cyberpunk', 'Science Fiction'],
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
      expect(results[0].rating).toBe(4.2);
      expect(results[0].rating_source).toBe('OpenLibrary');
      expect(results[0].platform).toBe('Ace Books');
      expect(results[0].director).toBe('William Gibson');
      expect(results[0].duration).toBe('271 págs');
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
                averageScore: 93,
                countryOfOrigin: 'JP',
                genres: ['Action', 'Fantasy'],
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
      expect(results[0].rating).toBe(9.3);
      expect(results[0].origin_country).toBe('Japão');
    });

    it('returns anime covers from AniList GraphQL with ratings, studio, and duration', async () => {
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
                averageScore: 91,
                countryOfOrigin: 'JP',
                duration: 24,
                genres: ['Adventure', 'Drama', 'Fantasy'],
                studios: { nodes: [{ name: 'MADHOUSE' }] },
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
      expect(results[0].rating).toBe(9.1);
      expect(results[0].rating_source).toBe('AniList');
      expect(results[0].platform).toBe('MADHOUSE');
      expect(results[0].origin_country).toBe('Japão');
      expect(results[0].duration).toBe('24 min/ep');
      expect(results[0].genres).toEqual(['Adventure', 'Drama', 'Fantasy']);
    });
  });

  describe('fetchKitsuManga', () => {
    it('returns manga covers from Kitsu API with rating and magazine platform', async () => {
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
              averageRating: '85.00',
              serialization: 'Weekly Shonen Jump',
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
      expect(results[0].type).toBe('manga');
      expect(results[0].rating).toBe(8.5);
      expect(results[0].rating_source).toBe('Kitsu');
      expect(results[0].platform).toBe('Weekly Shonen Jump');
    });
  });
});


import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchImdbMovies,
  fetchITunesMovies,
  searchCultureMedia,
  fetchJikan,
  fetchGoogleBooks,
  fetchTVMaze,
} from './culture-apis';

describe('culture-apis', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('fetchImdbMovies', () => {
    it('returns empty array for empty or whitespace query', async () => {
      const res = await fetchImdbMovies('   ');
      expect(res).toEqual([]);
    });

    it('successfully queries IMDb suggestions and enriches with Portuguese Wikipedia', async () => {
      const mockImdbResponse = {
        d: [
          {
            id: 'tt1798709',
            l: 'Her',
            q: 'feature',
            qid: 'movie',
            s: 'Joaquin Phoenix, Amy Adams',
            y: 2013,
            i: {
              imageUrl: 'https://m.media-amazon.com/images/M/poster._V1_.jpg',
              width: 500,
              height: 700,
            },
          },
          {
            id: 'nm2878358',
            l: 'H.E.R.',
            s: 'Soundtrack, The Color Purple',
            // person, not a movie
          },
        ],
      };

      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('imdb.com')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockImdbResponse,
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const results = await fetchImdbMovies('her');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'Her',
        year: 2013,
        synopsis: '',
        cast: 'Joaquin Phoenix, Amy Adams',
        cover: 'https://m.media-amazon.com/images/M/poster._V1_UX600_.jpg',
        total: 0,
        type: 'filme',
        api_id: 'tt1798709',
        api_source: 'imdb',
        status: 'finished',
      });
    });

    it('finds "Her" when searching in Portuguese alias ("ela")', async () => {
      const mockImdbResponse = {
        d: [
          {
            id: 'tt15516546',
            l: 'Ela Veezha Poonchira',
            q: 'feature',
            qid: 'movie',
            s: 'Soubin Shahir',
            y: 2022,
          },
          {
            id: 'tt1798709',
            l: 'Her',
            q: 'feature',
            qid: 'movie',
            s: 'Joaquin Phoenix, Amy Adams',
            y: 2013,
            i: {
              imageUrl: 'https://m.media-amazon.com/images/M/poster._V1_.jpg',
            },
          },
        ],
      };

      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('imdb.com')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockImdbResponse,
          } as Response);
        }
        return Promise.resolve({
          ok: false,
          status: 404,
        } as Response);
      });

      const results = await fetchImdbMovies('ela');

      expect(results).toHaveLength(2);
      expect(results[1].title).toBe('Her');
      expect(results[1].year).toBe(2013);
      expect(results[1].api_id).toBe('tt1798709');
      expect(results[1].synopsis).toBe('');
      expect(results[1].cast).toBe('Joaquin Phoenix, Amy Adams');
    });

    it('gracefully handles network errors without crashing', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const results = await fetchImdbMovies('matrix');
      expect(results).toEqual([]);
    });
  });

  describe('fetchITunesMovies', () => {
    it('queries iTunes with movie entity and maps results correctly', async () => {
      const mockItunesResponse = {
        resultCount: 1,
        results: [
          {
            kind: 'feature-movie',
            trackName: 'The Matrix',
            releaseDate: '1999-03-31T08:00:00Z',
            longDescription: 'Neo is a computer programmer.',
            artworkUrl100: 'https://is1-ssl.mzstatic.com/image/thumb/100x100bb.jpg',
            trackId: 271469518,
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockItunesResponse,
      } as Response);

      const results = await fetchITunesMovies('matrix');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        title: 'The Matrix',
        year: 1999,
        synopsis: 'Neo is a computer programmer.',
        cover: 'https://is1-ssl.mzstatic.com/image/thumb/600x600bb.jpg',
        total: 0,
        type: 'filme',
        api_id: '271469518',
        api_source: 'itunes',
        status: 'finished',
      });
    });
  });

  describe('searchCultureMedia', () => {
    it('returns empty array when query is empty', async () => {
      const results = await searchCultureMedia('', 'filme');
      expect(results).toEqual([]);
    });

    it('prefers IMDb results for movies, falling back to iTunes if IMDb returns none', async () => {
      const mockImdbEmpty = { d: [] };
      const mockItunesResponse = {
        results: [
          {
            kind: 'feature-movie',
            trackName: 'Fallback Movie',
            trackId: 12345,
            longDescription: 'Fallback description',
          },
        ],
      };

      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('imdb.com')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockImdbEmpty,
          } as Response);
        }
        if (url.includes('itunes.apple.com')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockItunesResponse,
          } as Response);
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const results = await searchCultureMedia('unknown', 'filme');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Fallback Movie');
      expect(results[0].api_source).toBe('itunes');
    });
  });
});

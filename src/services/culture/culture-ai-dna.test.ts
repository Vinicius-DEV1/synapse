import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractAiCulturalDna } from './culture-ai-dna';
import { CultureFeedbackStorage } from './culture-feedback-storage';
import { promptGemini } from '../gemini';
import type { CultureItem } from '../../types';

vi.mock('../gemini', () => ({
  promptGemini: vi.fn(),
}));

vi.mock('./culture-feedback-storage', () => ({
  CultureFeedbackStorage: {
    getCachedAiDna: vi.fn(),
    saveCachedAiDna: vi.fn(),
  },
}));

describe('culture-ai-dna', () => {
  const mockItems: CultureItem[] = [
    {
      id: '1',
      title: 'Love, Simon',
      type: 'filme',
      synopsis: 'Simon Spier guarda um grande segredo da sua família e amigos: ele é gay.',
      progress: 0,
      total_progress: 0,
      is_goal: false,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: '2',
      title: 'Love, Victor',
      type: 'série',
      synopsis: 'Victor em sua jornada de autodescoberta e aceitação na Creekwood High School.',
      progress: 0,
      total_progress: 0,
      is_goal: false,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty profile for empty library without calling Gemini', async () => {
    const result = await extractAiCulturalDna([], 'empty_hash');
    expect(result.thematic_axes).toContain('Cultura Geral');
    expect(promptGemini).not.toHaveBeenCalled();
  });

  it('returns cached profile if present and unexpired', async () => {
    const cachedProfile = {
      thematic_axes: ['Romance LGBTQIA+', 'Coming-of-Age'],
      core_influences: ['Becky Albertalli'],
      emotional_atmosphere: 'Acolhedor e sensível',
      key_anchor_works: ['Love, Simon'],
      extracted_at: '2024-01-01',
      library_hash: 'hash-abc',
    };
    vi.mocked(CultureFeedbackStorage.getCachedAiDna).mockResolvedValue(cachedProfile);

    const result = await extractAiCulturalDna(mockItems, 'hash-abc');
    expect(result).toEqual(cachedProfile);
    expect(promptGemini).not.toHaveBeenCalled();
  });

  it('calls Gemini, parses response, and caches result when cache misses', async () => {
    vi.mocked(CultureFeedbackStorage.getCachedAiDna).mockResolvedValue(null);
    vi.mocked(promptGemini).mockResolvedValue({
      text: JSON.stringify({
        thematic_axes: ['Romance LGBTQIA+ Juvenil', 'Autodescoberta Escolar', 'Coming-of-Age'],
        core_influences: ['Becky Albertalli', 'Greg Berlanti'],
        emotional_atmosphere: 'Acolhedor, sensível e inspirador com foco em vulnerabilidade.',
        key_anchor_works: ['Love, Simon', 'Love, Victor'],
      }),
      images: [],
    });

    const result = await extractAiCulturalDna(mockItems, 'hash-new');
    expect(result.thematic_axes).toContain('Romance LGBTQIA+ Juvenil');
    expect(result.core_influences).toContain('Becky Albertalli');
    expect(result.key_anchor_works).toContain('Love, Simon');
    expect(CultureFeedbackStorage.saveCachedAiDna).toHaveBeenCalledWith(
      expect.objectContaining({
        library_hash: 'hash-new',
        thematic_axes: expect.arrayContaining(['Romance LGBTQIA+ Juvenil']),
      })
    );
  });

  it('falls back gracefully to local heuristics when Gemini fails', async () => {
    vi.mocked(CultureFeedbackStorage.getCachedAiDna).mockResolvedValue(null);
    vi.mocked(promptGemini).mockRejectedValue(new Error('Quota exceeded'));

    const result = await extractAiCulturalDna(mockItems, 'hash-fail');
    expect(result).toBeDefined();
    expect(result.thematic_axes.length).toBeGreaterThan(0);
    expect(result.library_hash).toBe('hash-fail');
    expect(CultureFeedbackStorage.saveCachedAiDna).toHaveBeenCalled();
  });

  it('scales cleanly and synthesizes large library with 200 works without loss', async () => {
    vi.mocked(CultureFeedbackStorage.getCachedAiDna).mockResolvedValue(null);
    const largeLibrary: CultureItem[] = Array.from({ length: 200 }, (_, idx) => ({
      id: `item-${idx}`,
      title: idx % 10 === 0 ? `Romance Queer ${idx}` : `Sci-Fi Film ${idx}`,
      type: idx % 2 === 0 ? 'filme' : 'série',
      synopsis: idx % 10 === 0 ? 'Uma tocante jornada de amor e autodescoberta.' : 'Exploração espacial e IA.',
      progress: idx < 100 ? 1 : 0,
      total_progress: 1,
      is_goal: idx >= 150,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }));

    vi.mocked(promptGemini).mockImplementation(async (prompt: string) => {
      // Verify prompt contains multiple categorized sections from all 200 items
      expect(prompt).toContain('Completed Works (Definite high affinity - 100 works)');
      expect(prompt).toContain('Wishlist & Priority Goals (50 works)');
      expect(prompt).toContain('200 titles');
      return {
        text: JSON.stringify({
          thematic_axes: ['Ficção Científica & IA', 'Romance LGBTQIA+ & Autodescoberta'],
          core_influences: ['Denis Villeneuve', 'Alice Oseman'],
          emotional_atmosphere: 'Equilíbrio entre contemplação cósmica e intimidade afetiva.',
          key_anchor_works: ['Romance Queer 0', 'Sci-Fi Film 10'],
        }),
        images: [],
      };
    });

    const result = await extractAiCulturalDna(largeLibrary, 'hash-200');
    expect(result.thematic_axes).toHaveLength(2);
    expect(result.thematic_axes).toContain('Romance LGBTQIA+ & Autodescoberta');
    expect(promptGemini).toHaveBeenCalled();
  });

  it('preserves and passes all 200 completed films to Gemini without dropping a single work', async () => {
    vi.mocked(CultureFeedbackStorage.getCachedAiDna).mockResolvedValue(null);
    const twoHundredFilms: CultureItem[] = Array.from({ length: 200 }, (_, idx) => ({
      id: `film-${idx}`,
      title: `Film Title ${idx}`,
      type: 'filme',
      synopsis: `Synopsis for film ${idx}`,
      progress: 1,
      total_progress: 1,
      is_goal: false,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    }));

    let capturedPrompt = '';
    vi.mocked(promptGemini).mockImplementation(async (prompt: string) => {
      capturedPrompt = prompt;
      return {
        text: JSON.stringify({
          thematic_axes: ['Cinema de Autor', 'Dramas Existenciais'],
          core_influences: ['Auteur'],
          emotional_atmosphere: 'Profundo e contemplativo.',
          key_anchor_works: ['Film Title 0', 'Film Title 199'],
        }),
        images: [],
      };
    });

    const result = await extractAiCulturalDna(twoHundredFilms, 'hash-all-200');
    expect(result.thematic_axes).toContain('Cinema de Autor');
    // Ensure all 200 films from first to last are in the prompt
    expect(capturedPrompt).toContain('Film Title 0');
    expect(capturedPrompt).toContain('Film Title 99');
    expect(capturedPrompt).toContain('Film Title 100');
    expect(capturedPrompt).toContain('Film Title 199');
    expect(capturedPrompt).toContain('Completed Works (Definite high affinity - 200 works)');
  });
});


import { describe, it, expect } from 'vitest';
import { extractCulturalDNA, generateLibraryHash, extractCreatorSignatures } from './culture-dna-extractor';
import type { CultureItem } from '../../types';
import type { DislikedCultureItem, IgnoredCultureItem } from '../../types/culture-recommendations';

describe('culture-dna-extractor', () => {
  const mockItems: CultureItem[] = [
    {
      id: 'item-1',
      title: 'Her',
      type: 'filme',
      progress: 1,
      total_progress: 1,
      is_goal: false,
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
    },
    {
      id: 'item-2',
      title: 'Blade Runner 2049',
      type: 'filme',
      progress: 0,
      total_progress: 1,
      is_goal: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
    },
    {
      id: 'item-3',
      title: 'Steins;Gate',
      type: 'anime',
      progress: 12,
      total_progress: 24,
      is_goal: false,
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
    },
  ];

  const mockDisliked: DislikedCultureItem[] = [
    {
      id: 'disliked-1',
      title: 'Transformers 5',
      type: 'filme',
      disliked_at: '2024-01-01',
      reason: 'not_interested',
    },
  ];

  const mockIgnored: IgnoredCultureItem[] = [
    {
      id: 'ignored-1',
      title: 'Interstellar',
      type: 'filme',
      ignored_at: '2024-01-01',
      already_watched: true,
    },
  ];

  it('correctly extracts completed, in-progress, and goal items', () => {
    const dna = extractCulturalDNA(mockItems, mockDisliked, mockIgnored);

    expect(dna.totalItems).toBe(3);
    expect(dna.completedItems).toHaveLength(1);
    expect(dna.completedItems[0].title).toBe('Her');

    expect(dna.inProgressItems).toHaveLength(1);
    expect(dna.inProgressItems[0].title).toBe('Steins;Gate');
    expect(dna.inProgressItems[0].progressPercent).toBe(50);

    expect(dna.goalItems).toHaveLength(1);
    expect(dna.goalItems[0].title).toBe('Blade Runner 2049');

    expect(dna.topTypes[0]).toBe('filme');
  });

  it('includes negative signals (disliked and ignored)', () => {
    const dna = extractCulturalDNA(mockItems, mockDisliked, mockIgnored);

    expect(dna.dislikedTitles).toHaveLength(1);
    expect(dna.dislikedTitles[0].title).toBe('Transformers 5');

    expect(dna.ignoredTitles).toHaveLength(1);
    expect(dna.ignoredTitles[0].title).toBe('Interstellar');
  });

  it('generates consistent and deterministic library hashes', () => {
    const hash1 = generateLibraryHash(mockItems, mockDisliked, mockIgnored);
    const hash2 = generateLibraryHash([...mockItems], [...mockDisliked], [...mockIgnored]);
    expect(hash1).toBe(hash2);

    const changedDisliked: DislikedCultureItem[] = [
      ...mockDisliked,
      {
        id: 'disliked-2',
        title: 'Cats',
        type: 'filme',
        disliked_at: '2024-01-02',
      },
    ];
    const hash3 = generateLibraryHash(mockItems, changedDisliked, mockIgnored);
    expect(hash1).not.toBe(hash3);
  });

  it('detects cold start when library has fewer than 3 items', () => {
    const emptyDna = extractCulturalDNA([]);
    expect(emptyDna.isColdStart).toBe(true);

    const normalDna = extractCulturalDNA(mockItems);
    expect(normalDna.isColdStart).toBe(false);
  });

  it('extracts thematic keywords from synopses and titles', () => {
    const sciFiItems: CultureItem[] = [
      {
        id: 'sf-1',
        title: 'Ghost in the Shell',
        type: 'anime',
        synopsis: 'Um clássico do cyberpunk e inteligência artificial.',
        progress: 1,
        total_progress: 1,
        is_goal: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      {
        id: 'sf-2',
        title: 'Neuromancer',
        type: 'livro',
        synopsis: 'Ficção científica e distopia em um futuro cyberpunk.',
        progress: 100,
        total_progress: 100,
        is_goal: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ];

    const dna = extractCulturalDNA(sciFiItems);
    expect(dna.thematicKeywords).toContain('cyberpunk');
    expect(dna.thematicKeywords).toContain('ficção científica');
    expect(dna.prioritySeeds).toHaveLength(2);
  });

  it('extracts notable creator signatures from items', () => {
    const creatorItems: CultureItem[] = [
      {
        id: 'cr-1',
        title: 'Oppenheimer',
        type: 'filme',
        synopsis: 'Dirigido por Christopher Nolan, narra o projeto Manhattan.',
        progress: 1,
        total_progress: 1,
        is_goal: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
      {
        id: 'cr-2',
        title: 'A Viagem de Chihiro',
        type: 'anime',
        synopsis: 'Obra-prima de Hayao Miyazaki pelo Studio Ghibli.',
        progress: 1,
        total_progress: 1,
        is_goal: false,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      },
    ];

    const signatures = extractCreatorSignatures(creatorItems);
    expect(signatures).toContain('Christopher Nolan');
    expect(signatures).toContain('Hayao Miyazaki');
    expect(signatures).toContain('Studio Ghibli');

    const dna = extractCulturalDNA(creatorItems);
    expect(dna.creatorSignatures).toEqual(expect.arrayContaining(['Christopher Nolan', 'Hayao Miyazaki']));
  });
});

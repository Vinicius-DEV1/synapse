import { describe, it, expect } from 'vitest';
import { buildCultureRecommendationsPrompt } from './culture-recommendations-prompt';
import type { UserCulturalDNA } from './culture-dna-extractor';

describe('culture-recommendations-prompt', () => {
  const mockDNA: UserCulturalDNA = {
    totalItems: 5,
    completedItems: [{ title: 'Dune: Part Two', type: 'filme' }],
    inProgressItems: [{ title: 'Severance', type: 'série', progressPercent: 75 }],
    goalItems: [{ title: 'Foundation', type: 'livro' }],
    typeDistribution: { filme: 2, série: 2, livro: 1 },
    topTypes: ['filme', 'série', 'livro'],
    dislikedTitles: [{ title: 'Twilight', type: 'filme' }],
    ignoredTitles: [{ title: 'Matrix', type: 'filme' }],
    libraryHash: 'hash-123',
    isColdStart: false,
    thematicKeywords: ['ficção científica', 'distopia'],
    creatorSignatures: ['Denis Villeneuve'],
    prioritySeeds: [{ title: 'Dune: Part Two', type: 'filme' }],
  };

  it('builds a prompt containing user profile, exclusions, anchors, and creator lineage', () => {
    const freshAnchors = [
      { title: 'Chainsaw Man S2', type: 'anime' as const, releaseNote: 'Em exibição' },
    ];

    const prompt = buildCultureRecommendationsPrompt(mockDNA, freshAnchors, 'safe');

    expect(prompt).toContain('Dune: Part Two');
    expect(prompt).toContain('Severance');
    expect(prompt).toContain('Foundation');
    expect(prompt).toContain('Twilight');
    expect(prompt).toContain('Matrix');
    expect(prompt).toContain('Chainsaw Man S2');
    expect(prompt).toContain('Denis Villeneuve');
    expect(prompt).toContain('EXCLUSION LIST');
    expect(prompt).toContain('REAL-TIME BROADCAST & SEASON ANCHORS');
    expect(prompt).toContain('SAFE BET MODE ACTIVE');
  });

  it('adapts prompt directives for explore mode (anti-cliché serendipity)', () => {
    const prompt = buildCultureRecommendationsPrompt(mockDNA, [], 'explore');

    expect(prompt).toContain('EXPLORATION MODE ACTIVE');
    expect(prompt).toContain('Serendipity & Horizon Expansion');
  });

  it('adapts prompt directives for volume settings (quadruple vs standard)', () => {
    const quadPrompt = buildCultureRecommendationsPrompt(mockDNA, [], 'safe', [], 'quadruple');
    expect(quadPrompt).toContain('strictly 4 cohesive thematic collections');
    expect(quadPrompt).toContain('strictly 14 to 18 laser-focused, high-caliber recommendations');
    expect(quadPrompt).toContain('target 56 to 70 total works');

    const standardPrompt = buildCultureRecommendationsPrompt(mockDNA, [], 'safe', [], 'standard');
    expect(standardPrompt).toContain('strictly 3 to 4 major thematic collections');
    expect(standardPrompt).toContain('6 to 8 laser-focused recommendations');
  });

  it('injects strict format exclusions and volume compensation directive when types are excluded', () => {
    const prompt = buildCultureRecommendationsPrompt(
      mockDNA,
      [],
      'safe',
      [],
      'quadruple',
      null,
      ['livro', 'anime'],
      ['terror', 'gore']
    );

    // Format exclusions
    expect(prompt).toContain('=== STRICT FORMAT EXCLUSIONS & DENSITY COMPENSATION ===');
    expect(prompt).toContain('Excluded formats: livro, anime');
    expect(prompt).toContain('ALLOWED FORMATS ONLY: filme, série, manga, hq, novel');
    expect(prompt).toContain('REDISTRIBUTION & FULL VOLUME COMPENSATION');
    expect(prompt).toContain('NEVER recommend any work belonging to the excluded formats: livro, anime');

    // JSON schema constraint
    expect(prompt).toContain('"type": "filme" | "série" | "manga" | "hq" | "novel"');

    // Theme exclusions
    expect(prompt).toContain('=== FORBIDDEN THEMES & GENRES (STRICTLY EXCLUDED) ===');
    expect(prompt).toContain('- terror');
    expect(prompt).toContain('- gore');
  });

  it('includes complete library acervo without truncating at 60 items', () => {
    // Generate a library with 120 items
    const largeLibraryTitles = Array.from({ length: 120 }, (_, idx) => `Work Title Number ${idx + 1}`);
    const largeDNA: UserCulturalDNA = {
      ...mockDNA,
      totalItems: 120,
      allLibraryTitles: largeLibraryTitles,
    };

    const prompt = buildCultureRecommendationsPrompt(largeDNA, [], 'safe');

    // Both the 1st and the 120th item must be present in the prompt
    expect(prompt).toContain('Work Title Number 1');
    expect(prompt).toContain('Work Title Number 60');
    expect(prompt).toContain('Work Title Number 61');
    expect(prompt).toContain('Work Title Number 120');
    expect(prompt).toContain('Complete user library (ABSOLUTELY FORBIDDEN TO SUGGEST)');
    expect(prompt).toContain('extended cut, director\'s cut, or subsequent season');
  });
});


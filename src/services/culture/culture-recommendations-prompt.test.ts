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
});

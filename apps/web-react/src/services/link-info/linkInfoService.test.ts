import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrGenerateLinkInfo } from './linkInfoService';
import * as linkVault from '../link-vault/linkVaultService';
import * as gemini from '../gemini';

// Mock gemini
vi.mock('../gemini', () => ({
  promptGemini: vi.fn(async () => ({
    text: '# Resumo Didático\n\n> **Síntese**: Conteúdo didático sobre o tema.',
  })),
}));

// Mock linkVaultService
const mockEntities = new Map<string, any>();
vi.mock('../link-vault/linkVaultService', () => ({
  getLinkEntity: vi.fn(async (url: string) => mockEntities.get(url) || null),
  saveLinkEntity: vi.fn(async (data: any) => {
    mockEntities.set(data.url, { ...mockEntities.get(data.url), ...data });
    return mockEntities.get(data.url);
  }),
}));

// Mock platform
vi.mock('../platform', () => ({
  isDesktopApp: vi.fn(() => false),
}));

// Mock scrap storage
vi.mock('../scrap/scrap-storage', () => ({
  getDecryptedScrap: vi.fn(async () => '<html><body><article><h1>Artigo</h1><p>Texto</p></article></body></html>'),
}));

describe('linkInfoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEntities.clear();
    // Mock global fetch for proxy fallback
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html><body><article><h1>Vite Next Generation</h1><p>Fast frontend tooling.</p></article></body></html>',
      json: async () => ({ contents: '<html><body><article><h1>Vite</h1><p>Fast frontend tooling.</p></article></body></html>' }),
    } as any);
  });

  it('returns cached summary immediately if available in Link Vault', async () => {
    mockEntities.set('https://vite.dev', {
      url: 'https://vite.dev',
      title: 'Vite',
      aiSummary: 'Resumo salvo em cache do Vite',
      aiSummaryCreatedAt: '2026-09-15T00:00:00.000Z',
    });

    const result = await getOrGenerateLinkInfo('https://vite.dev');

    expect(result.isCached).toBe(true);
    expect(result.summary).toBe('Resumo salvo em cache do Vite');
    expect(gemini.promptGemini).not.toHaveBeenCalled();
  });

  it('generates summary via Gemini when not cached and persists to Link Vault', async () => {
    const onProgress = vi.fn();
    const result = await getOrGenerateLinkInfo('https://vite.dev', { onProgress });

    expect(result.isCached).toBe(false);
    expect(result.summary).toContain('Resumo Didático');
    expect(gemini.promptGemini).toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalled();

    // Verify entity was saved to Link Vault
    expect(linkVault.saveLinkEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://vite.dev',
        aiSummary: expect.stringContaining('Resumo Didático'),
      })
    );
  });
});

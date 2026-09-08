import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptGemini, fetchGeminiModels } from './client';
import * as keysModule from './keys';
import type { GeminiKeyEntry } from './types';

describe('Gemini Client Multi-Key Resilient Failover', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    keysModule.resetKeyRotationIndex();
  });

  it('rotates to next key and marks key 1 as error when receiving 400/403 (invalid/revoked key)', async () => {
    const mockKeys: GeminiKeyEntry[] = [
      { id: 'key-bad', key: 'AIzaSyBadKeyRevoked', status: 'active', addedAt: 1 },
      { id: 'key-good', key: 'AIzaSyGoodWorkingKey', status: 'active', addedAt: 2 },
    ];

    vi.spyOn(keysModule, 'getGeminiKeys').mockResolvedValue(mockKeys);
    const updateKeySpy = vi.spyOn(keysModule, 'updateGeminiKeyStatus').mockResolvedValue();

    // First fetch call (key-bad) returns 403
    // Second fetch call (key-good) returns 200 with candidates
    let fetchCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      fetchCount++;
      if (url.includes('AIzaSyBadKeyRevoked')) {
        return {
          ok: false,
          status: 403,
          json: async () => ({
            error: { code: 403, message: 'API_KEY_REVOKED or permission denied' },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Resposta gerada com sucesso!' }] } }],
        }),
      };
    }));

    const result = await promptGemini('Pergunta de teste', undefined, [], 'gemini-2.0-flash');

    expect(result.text).toBe('Resposta gerada com sucesso!');
    expect(fetchCount).toBe(2);
    expect(updateKeySpy).toHaveBeenCalledWith(
      'key-bad',
      'error',
      undefined,
      expect.stringContaining('API_KEY_REVOKED')
    );
  });

  it('rotates to next key and marks key 1 as exhausted when receiving 429 quota error', async () => {
    const mockKeys: GeminiKeyEntry[] = [
      { id: 'key-quota-limit', key: 'AIzaSyQuotaExhausted', status: 'active', addedAt: 1 },
      { id: 'key-healthy', key: 'AIzaSyHealthyKey', status: 'active', addedAt: 2 },
    ];

    vi.spyOn(keysModule, 'getGeminiKeys').mockResolvedValue(mockKeys);
    const updateKeySpy = vi.spyOn(keysModule, 'updateGeminiKeyStatus').mockResolvedValue();

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('AIzaSyQuotaExhausted')) {
        return {
          ok: false,
          status: 429,
          json: async () => ({
            error: { code: 429, message: 'Resource has been exhausted (check quota).' },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Resposta com chave saudável' }] } }],
        }),
      };
    }));

    const result = await promptGemini('Pergunta', undefined, [], 'gemini-2.0-flash');

    expect(result.text).toBe('Resposta com chave saudável');
    expect(updateKeySpy).toHaveBeenCalledWith(
      'key-quota-limit',
      'exhausted',
      expect.any(Number),
      expect.stringContaining('Limite por minuto')
    );
  });

  it('rotates across keys in fetchGeminiModels when first key fails', async () => {
    const mockKeys: GeminiKeyEntry[] = [
      { id: 'k1', key: 'AIzaSyBroken', status: 'active', addedAt: 1 },
      { id: 'k2', key: 'AIzaSyWorking', status: 'active', addedAt: 2 },
    ];

    vi.spyOn(keysModule, 'getGeminiKeys').mockResolvedValue(mockKeys);
    vi.spyOn(keysModule, 'updateGeminiKeyStatus').mockResolvedValue();

    vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('AIzaSyBroken')) {
        return {
          ok: false,
          status: 403,
          json: async () => ({ error: { message: 'The API key is invalid' } }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          models: [
            {
              name: 'models/gemini-2.0-flash',
              version: 'v1beta',
              displayName: 'Gemini 2.0 Flash',
              description: 'Fast multimodal model',
            },
          ],
        }),
      };
    }));

    const models = await fetchGeminiModels();

    expect(models).toHaveLength(1);
    expect(models[0].name).toBe('models/gemini-2.0-flash');
    expect(models[0].displayName).toBe('Gemini 2.0 Flash');
  });

  it('provides helpful server error message when Google servers are down (503)', async () => {
    const mockKeys: GeminiKeyEntry[] = [
      { id: 'k1', key: 'AIzaSyKey1', status: 'active', addedAt: 1 },
    ];

    vi.spyOn(keysModule, 'getGeminiKeys').mockResolvedValue(mockKeys);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: { message: 'Service Unavailable' } }),
    }));

    await expect(
      promptGemini('Teste', undefined, [], 'gemini-2.0-flash')
    ).rejects.toThrow('Os servidores da IA do Google estão temporariamente instáveis (5xx)');
  });
});

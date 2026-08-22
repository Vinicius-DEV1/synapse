import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDictionaryQuery } from './useDictionaryQuery';
import * as geminiService from '../../../services/gemini';

vi.mock('../../../services/gemini', () => ({
  promptGemini: vi.fn(),
}));

describe('useDictionaryQuery Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches online definition and sets dictionaryData', async () => {
    const mockData = {
      analyzed_word: 'resilience',
      detected_language: 'en',
      phonetics: { us: '/rɪˈzɪl.jəns/' },
      audio_url: 'https://example.com/audio.mp3',
      context_explanation: 'Capacidade de adaptação',
      meanings: [
        {
          partOfSpeech: 'noun',
          definitions: [
            {
              definition: 'The capacity to recover quickly from difficulties.',
              translation: 'Resiliência',
              example: 'He showed great resilience.',
            },
          ],
        },
      ],
      collocations: [],
    };

    vi.mocked(geminiService.promptGemini).mockResolvedValue({
      text: JSON.stringify(mockData),
    } as any);

    const { result } = renderHook(() =>
      useDictionaryQuery({ hasOfflineDictionary: false } as any, 'book')
    );

    await act(async () => {
      await result.current.fetchDefinition('resilience', 'Context sentence', 'online');
    });

    expect(result.current.dictionaryData).toEqual(
      expect.objectContaining({ analyzed_word: 'resilience' })
    );
  });
});

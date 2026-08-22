import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import DictionaryModal from './DictionaryModal';

vi.mock('../ui/Portal', () => ({
  Portal: ({ children }: any) => <div data-testid="dict-portal">{children}</div>,
}));

vi.mock('../../utils/settings', () => ({
  getSettings: vi.fn(() => ({
    dictionaryMode: 'offline',
    hasOfflineDictionary: true,
  })),
}));

vi.mock('./dictionary/useDictionaryQuery', () => ({
  useDictionaryQuery: vi.fn(() => ({
    loading: false,
    result: null,
    dictionaryData: {
      word: 'perseverance',
      phonetic: '/ˌpɜː.sɪˈvɪə.rəns/',
      meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'Persistence in doing something.' }] }],
      detected_language: 'en',
    },
    setDictionaryData: vi.fn(),
    languageTab: 'en',
    setLanguageTab: vi.fn(),
    error: null,
    fetchDefinition: vi.fn(),
  })),
}));

vi.mock('./dictionary/DictionaryContent', () => ({
  DictionaryContent: ({ dictionaryData }: any) => (
    <div data-testid="dictionary-content">
      Palavra: {dictionaryData?.word}
    </div>
  ),
}));

describe('DictionaryModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dictionary title, mode toggle and definition content', () => {
    const onClose = vi.fn();
    const { getByText, getByTestId } = render(
      <DictionaryModal text="perseverance" onClose={onClose} />
    );

    expect(getByText('Dicionário')).toBeDefined();
    expect(getByText('Offline')).toBeDefined();
    expect(getByTestId('dictionary-content')).toBeDefined();
    expect(getByText(/Palavra: perseverance/i)).toBeDefined();
  });
});

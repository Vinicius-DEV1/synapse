import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import AIAssistantModal from './AIAssistantModal';

vi.mock('../../services/gemini', () => ({
  fetchGeminiModels: vi.fn().mockResolvedValue([
    { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
  ]),
}));

vi.mock('../../utils/settings', () => ({
  getSettings: vi.fn(() => ({
    geminiModelFlashcards: 'gemini-2.5-flash',
  })),
}));

vi.mock('../ui/Portal', () => ({
  Portal: ({ children }: { children: ReactNode }) => <div data-testid="anki-ai-portal">{children}</div>,
}));

vi.mock('./AIGenerationView', () => ({
  default: () => <div data-testid="ai-generation-view">AIGenerationView Content</div>,
}));

vi.mock('./AIChatAnalysisView', () => ({
  default: () => <div data-testid="ai-chat-analysis-view">AIChatAnalysisView Content</div>,
}));

describe('AIAssistantModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as { api: unknown }).api = {
      anki: {
        getDecks: vi.fn().mockResolvedValue([{ id: 'deck_1', name: 'Inglês Avançado' }]),
        getAllCards: vi.fn().mockResolvedValue({ cards: [] }),
      },
    };
  });

  it('renders modal with generation view and allows switching to analysis view', async () => {
    const onClose = vi.fn();
    const onAddCards = vi.fn();

    let renderResult: ReturnType<typeof render>;
    await act(async () => {
      renderResult = render(
        <AIAssistantModal deckId="deck_1" onClose={onClose} onAddCards={onAddCards} />
      );
    });

    const { getByText, getByTestId } = renderResult!;

    expect(getByText(/Assistente IA de Cartões/i)).toBeDefined();
    expect(getByTestId('ai-generation-view')).toBeDefined();

    // Switch to Chat & Analysis mode
    const analyzeTabBtn = getByText(/Analisar Baralho \(Chat\)/i);
    await act(async () => {
      fireEvent.click(analyzeTabBtn);
    });

    expect(getByTestId('ai-chat-analysis-view')).toBeDefined();
  });
});

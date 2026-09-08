import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import QuestionsView, { resetQuestionsViewCache } from './QuestionsView';

vi.mock('../../store/useStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../store/useStore')>();
  return {
    ...actual,
    useStore: () => ({
      state: { tabs: [{ id: 'tab-1' }], activeTabId: 'tab-1', pages: [] },
      dispatch: vi.fn(),
    }),
  };
});

const mockBatteries = [
  {
    id: 'bat-1',
    title: 'Bateria Redes',
    description: 'Camadas OSI',
    layout: 'sequential' as const,
    tags: ['redes'],
    created_at: '2026-09-08T00:00:00.000Z',
    updated_at: '2026-09-08T00:00:00.000Z',
    questions: [
      {
        id: 'q1',
        battery_id: 'bat-1',
        type: 'multiple_choice' as const,
        question: 'Qual a porta do HTTPS?',
        options: ['80', '443'],
        correct_index: 1,
        expected_answer: '',
        explanation: '443 é HTTPS',
        tags: ['redes'],
        sort_order: 1,
        created_at: '2026-09-08T00:00:00.000Z',
        updated_at: '2026-09-08T00:00:00.000Z',
      },
    ],
    latestAttempts: {
      q1: {
        id: 'att-1',
        question_id: 'q1',
        battery_id: 'bat-1',
        type: 'multiple_choice' as const,
        selected_index: 1,
        is_correct: true,
        duration_ms: 500,
        created_at: '2026-09-08T00:00:00.000Z',
      },
    },
    linkedPages: [{ id: 'page-redes', title: 'Redes de Computadores' }],
  },
];

const mockStats = {
  totalBatteries: 1,
  totalQuestions: 1,
  answeredQuestions: 1,
  correctAnswers: 1,
  incorrectAnswers: 0,
  accuracyRate: 100,
  tagStats: { redes: { total: 1, correct: 1, answered: 1 } },
};

describe('QuestionsView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQuestionsViewCache();

    window.api = {
      ...window.api,
      quiz: {
        getAllBatteries: vi.fn().mockResolvedValue(mockBatteries),
        getAllBatteriesEnriched: vi.fn().mockResolvedValue(mockBatteries),
        getBatteryWithQuestions: vi.fn().mockImplementation((id: string) =>
          Promise.resolve(mockBatteries.find((b) => b.id === id) || null)
        ),
        getStats: vi.fn().mockResolvedValue(mockStats),
        saveBattery: vi.fn(),
        saveQuestionsBatch: vi.fn(),
        deleteBattery: vi.fn(),
      } as any,
    } as any;
  });

  it('renders module header and navigation sections', async () => {
    const { getByText } = render(<QuestionsView />);

    expect(getByText('Central de Questões')).toBeDefined();
    expect(getByText('Explorador')).toBeDefined();
    expect(getByText('Métricas')).toBeDefined();
    expect(getByText('Simulados & Erros')).toBeDefined();
    expect(getByText('Nova Bateria')).toBeDefined();

    await waitFor(() => {
      expect(getByText('Bateria Redes')).toBeDefined();
      expect(getByText('Redes de Computadores')).toBeDefined();
    });
  });

  it('switches to Métricas tab and displays dashboard stats', async () => {
    const { getByText } = render(<QuestionsView />);

    const metricsTab = getByText('Métricas');
    fireEvent.click(metricsTab);

    await waitFor(() => {
      expect(getByText('Taxa de Acertos')).toBeDefined();
      expect(getByText('Desempenho por Matéria / Tags')).toBeDefined();
    });
  });

  it('switches to Simulados & Erros tab', async () => {
    const { getByText } = render(<QuestionsView />);

    const playlistsTab = getByText('Simulados & Erros');
    fireEvent.click(playlistsTab);

    await waitFor(() => {
      expect(getByText('Caderno de Erros')).toBeDefined();
      expect(getByText('Simulado Personalizado')).toBeDefined();
    });
  });

  it('opens full-page editor upon clicking "Nova Bateria" and returns to explorer on Voltar click', async () => {
    const { getByText, getByPlaceholderText, getByTitle } = render(<QuestionsView />);

    const newBtn = getByText('Nova Bateria');
    fireEvent.click(newBtn);

    expect(getByPlaceholderText('Título da Bateria...')).toBeDefined();
    expect(getByTitle('Voltar')).toBeDefined();

    // Clicking Voltar closes the full-page editor and returns to Explorer
    const backBtn = getByTitle('Voltar');
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(getByText('Central de Questões')).toBeDefined();
      expect(getByText('Explorador')).toBeDefined();
    });
  });
});


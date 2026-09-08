import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { QuestionsPlaylists } from './QuestionsPlaylists';

vi.mock('../../services/quiz/quizSimulator', () => ({
  generateErrorNotebook: vi.fn().mockResolvedValue({
    battery: { id: 'sim-errors', title: 'Caderno de Erros' },
    questions: [{ id: 'err-1', question: 'Questão errada', type: 'multiple_choice' }],
  }),
  generateFilteredStudySession: vi.fn().mockResolvedValue({
    battery: { id: 'sim-filtered', title: 'Simulado Personalizado' },
    questions: [{ id: 'sim-1', question: 'Questão simulada', type: 'multiple_choice' }],
  }),
}));

describe('QuestionsPlaylists Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.api = {
      ...window.api,
      quiz: {} as any,
    } as any;
  });

  it('renders Caderno de Erros and Simulado builder cards', () => {
    const { getByText } = render(
      <QuestionsPlaylists
        onStartSession={vi.fn()}
        availableTags={['direito', 'redes']}
        errorCount={7}
      />
    );

    expect(getByText('Caderno de Erros')).toBeDefined();
    expect(getByText('7 questões pendentes de revisão')).toBeDefined();
    expect(getByText('Simulado Personalizado')).toBeDefined();
    expect(getByText('Iniciar Caderno de Erros')).toBeDefined();
  });

  it('launches error notebook session when clicking button', async () => {
    const onStart = vi.fn();

    const { getByText } = render(
      <QuestionsPlaylists
        onStartSession={onStart}
        availableTags={['direito', 'redes']}
        errorCount={5}
      />
    );

    fireEvent.click(getByText('Iniciar Caderno de Erros'));

    await waitFor(() => {
      expect(onStart).toHaveBeenCalledWith(
        expect.objectContaining({
          battery: expect.objectContaining({ title: 'Caderno de Erros' }),
        })
      );
    });
  });

  it('toggles tags in simulado config and launches filtered session', async () => {
    const onStart = vi.fn();

    const { getByText } = render(
      <QuestionsPlaylists
        onStartSession={onStart}
        availableTags={['direito', 'redes']}
        errorCount={5}
      />
    );

    // Toggle tag #direito
    fireEvent.click(getByText('#direito'));

    // Click Iniciar Simulado
    fireEvent.click(getByText('Iniciar Simulado'));

    await waitFor(() => {
      expect(onStart).toHaveBeenCalledWith(
        expect.objectContaining({
          battery: expect.objectContaining({ title: 'Simulado Personalizado' }),
        })
      );
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { QuizEditorModal } from './QuizEditorModal';
import type { QuestionItem } from '../types';

describe('QuizEditorModal (Full-Page Question Editor)', () => {
  const mockQuestions: QuestionItem[] = [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'Qual o protocolo de transporte confiável?',
      options: ['UDP', 'TCP', 'IP', 'ICMP'],
      correctIndex: 1,
      tags: ['redes'],
      selectedIndex: null,
      expectedAnswer: '',
      userTypedAnswer: '',
      aiFeedback: null,
      explanation: 'TCP é orientado à conexão.',
      showExplanation: false,
      answered: false,
    },
  ];

  it('renders as in-flow page with Voltar button, title, and action controls', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    const { getByTitle, getByPlaceholderText, getByText } = render(
      <QuizEditorModal
        isOpen={true}
        onClose={onClose}
        batteryTitle="Bateria Redes"
        batteryDescription="Protocolos da camada de transporte"
        initialQuestions={mockQuestions}
        onSave={onSave}
      />
    );

    expect(getByTitle('Voltar')).toBeDefined();
    expect(getByPlaceholderText('Título da Bateria...')).toBeDefined();
    expect(getByText('Assistente IA')).toBeDefined();
    expect(getByText('Importar')).toBeDefined();
    expect(getByText('Salvar Alterações')).toBeDefined();
  });

  it('calls onClose when clicking the Voltar button', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    const { getByTitle } = render(
      <QuizEditorModal
        isOpen={true}
        onClose={onClose}
        batteryTitle="Bateria Redes"
        initialQuestions={mockQuestions}
        onSave={onSave}
      />
    );

    const backBtn = getByTitle('Voltar');
    fireEvent.click(backBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSave with updated title and questions when clicking Salvar Alterações', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    const { getByText, getByPlaceholderText } = render(
      <QuizEditorModal
        isOpen={true}
        onClose={onClose}
        batteryTitle="Bateria Original"
        initialQuestions={mockQuestions}
        onSave={onSave}
      />
    );

    const titleInput = getByPlaceholderText('Título da Bateria...');
    fireEvent.change(titleInput, { target: { value: 'Bateria Modificada' } });

    const saveBtn = getByText('Salvar Alterações');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('Bateria Modificada', '', expect.any(Array));
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when pressing Escape key', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();

    render(
      <QuizEditorModal
        isOpen={true}
        onClose={onClose}
        batteryTitle="Bateria Redes"
        initialQuestions={mockQuestions}
        onSave={onSave}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

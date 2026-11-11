import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentAiModal } from './DocumentAiModal';
import * as aiService from '../services/documentAiService';
import * as appender from '../services/quizBatteryAppender';
import type { ReferencedBattery, QuestionItem } from '../../../editor-extensions/quiz/types';

vi.mock('../services/documentAiService', () => ({
  sendDocumentAiPrompt: vi.fn(),
}));

vi.mock('../services/quizBatteryAppender', () => ({
  appendQuestionsToBattery: vi.fn().mockResolvedValue(true),
}));

describe('DocumentAiModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    documentTitle: 'artigo.md',
    documentText: '# Artigo Inicial\n\nTexto original.',
    onApplyChanges: vi.fn().mockResolvedValue(true),
  };

  const mockBattery: ReferencedBattery = {
    id: 'bat_test',
    title: 'Bateria de Algoritmos',
    pageId: 'page_alg',
    pageTitle: 'Algoritmos e Estruturas',
    questionCount: 2,
    questions: [],
  };

  const mockQuestion: QuestionItem = {
    id: 'q_gen',
    type: 'multiple_choice',
    question: 'Qual a complexidade do QuickSort?',
    options: ['O(N log N)', 'O(N^2)', 'O(1)', 'O(N)'],
    correctIndex: 0,
    selectedIndex: null,
    expectedAnswer: '',
    userTypedAnswer: '',
    aiFeedback: null,
    explanation: 'Em média é O(N log N).',
    showExplanation: false,
    answered: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with title and quick suggestions when open', () => {
    render(<DocumentAiModal {...defaultProps} />);

    expect(screen.getByText(/Assistente IA:/i)).toBeInTheDocument();
    expect(screen.getByText('artigo.md')).toBeInTheDocument();
    expect(screen.getByText(/Aprofundar o tópico principal/i)).toBeInTheDocument();
  });

  it('submits a user prompt and renders AI response', async () => {
    vi.mocked(aiService.sendDocumentAiPrompt).mockResolvedValueOnce({
      chatText: 'Expandi o primeiro parágrafo com mais detalhes.',
      proposedMarkdown: '# Artigo Inicial\n\nTexto expandido com detalhes.',
      hasChanges: true,
    });

    render(<DocumentAiModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Peça à IA para editar o texto/i);
    fireEvent.change(input, { target: { value: 'Aprofunde o texto' } });

    const submitBtn = screen.getByTitle('Enviar instrução');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(aiService.sendDocumentAiPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          userInstruction: 'Aprofunde o texto',
          documentTitle: 'artigo.md',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Revisão de Alterações Propostas pela IA/i)).toBeInTheDocument();
    });
  });

  it('renders generated questions card and adds questions to referenced battery', async () => {
    vi.mocked(aiService.sendDocumentAiPrompt).mockResolvedValueOnce({
      chatText: 'Gerei 1 nova questão sobre ordenação.',
      hasChanges: false,
      generatedQuestions: [mockQuestion],
      targetBattery: mockBattery,
    });

    render(<DocumentAiModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(/Peça à IA para editar o texto/i);
    fireEvent.change(input, { target: { value: 'Crie questões sobre algoritmos' } });

    await waitFor(() => {
      expect(screen.getByTitle('Enviar instrução')).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTitle('Enviar instrução'));

    await waitFor(() => {
      expect(aiService.sendDocumentAiPrompt).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText(/1 nova\(s\) questão\(ões\) gerada\(s\)/i)).toBeInTheDocument();
      expect(screen.getByText(/@Bateria de Algoritmos/i)).toBeInTheDocument();
    });

    const addBtn = screen.getByText(/Adicionar 1 Questões à Bateria/i);
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(appender.appendQuestionsToBattery).toHaveBeenCalledWith(
        mockBattery,
        [mockQuestion]
      );
    });
  });
});

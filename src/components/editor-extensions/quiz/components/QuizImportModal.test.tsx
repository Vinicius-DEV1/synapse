import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import QuizImportModal from './QuizImportModal';
import * as geminiModule from '../../../../services/gemini';
import * as pdfExtractorModule from '../../../../utils/pdf-text-extractor';

vi.mock('../../../../services/gemini', () => ({
  sanitizeExpectedAnswer: vi.fn((val: string) => val),
  promptGeminiToParseDocumentToQuizJSON: vi.fn(),
  promptGeminiToRefineImportedQuestions: vi.fn(),
  getCadernoQuizJsonSchemaPrompt: vi.fn(() => 'MOCK_SCHEMA_PROMPT'),
}));

vi.mock('../../../../utils/pdf-text-extractor', () => ({
  extractTextFromPdf: vi.fn(),
}));

vi.mock('../../../ui/ToastContext', () => ({
  triggerToast: vi.fn(),
}));

describe('QuizImportModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('parses valid JSON array and previews imported questions', () => {
    const onClose = vi.fn();
    const onImport = vi.fn();

    render(<QuizImportModal isOpen={true} onClose={onClose} onImport={onImport} />);

    const validJson = JSON.stringify([
      {
        question: 'Qual o principal gás do efeito estufa?',
        options: ['Oxigênio', 'Dióxido de Carbono', 'Hélio', 'Nitrogênio'],
        correct_option: 1,
        explanation: 'CO2 é o gás primário emitido por atividades humanas.',
      },
    ]);

    const textarea = screen.getByPlaceholderText(/Cole aqui o JSON ou texto/i);
    fireEvent.change(textarea, { target: { value: validJson } });

    const processBtn = screen.getByText(/Processar e Ver Preview/i);
    fireEvent.click(processBtn);

    expect(screen.getByText(/Qual o principal gás do efeito estufa\?/i)).toBeDefined();

    const confirmImportBtn = screen.getByText(/Confirmar Importação/i);
    fireEvent.click(confirmImportBtn);

    expect(onImport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          question: 'Qual o principal gás do efeito estufa?',
          correctIndex: 1,
        }),
      ]),
      'append'
    );
  });

  it('allows copying AI prompt schema to clipboard', async () => {
    render(<QuizImportModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />);

    const copyBtn = screen.getByText(/Copiar Prompt para IA/i);
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('MOCK_SCHEMA_PROMPT');
    });
  });

  it('allows removing a specific question card directly in preview', () => {
    render(<QuizImportModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />);

    const validJson = JSON.stringify([
      {
        question: 'Primeira Questão',
        options: ['A', 'B'],
        correct_option: 0,
      },
      {
        question: 'Segunda Questão para Deletar',
        options: ['C', 'D'],
        correct_option: 1,
      },
    ]);

    const textarea = screen.getByPlaceholderText(/Cole aqui o JSON ou texto/i);
    fireEvent.change(textarea, { target: { value: validJson } });

    const processBtn = screen.getByText(/Processar e Ver Preview/i);
    fireEvent.click(processBtn);

    expect(screen.getByText(/Primeira Questão/i)).toBeDefined();
    expect(screen.getByText(/Segunda Questão para Deletar/i)).toBeDefined();

    // Find and click the delete button of the second question in the Portal
    const deleteButtons = screen.getAllByTitle('Remover esta questão do preview');
    expect(deleteButtons.length).toBe(2);
    fireEvent.click(deleteButtons[1]);

    expect(screen.queryByText(/Segunda Questão para Deletar/i)).toBeNull();
    expect(screen.getByText(/Primeira Questão/i)).toBeDefined();
  });

  it('handles markdown file import via AI parsing', async () => {
    const mockAiQuestions = [
      {
        type: 'multiple_choice' as const,
        question: 'Pergunta do Markdown',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
        expectedAnswer: '',
        explanation: 'Explicacao',
        tags: ['MD'],
      },
    ];

    vi.spyOn(geminiModule, 'promptGeminiToParseDocumentToQuizJSON').mockResolvedValueOnce(
      mockAiQuestions
    );

    render(<QuizImportModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />);

    const mdFile = new File(['# Questão\n1. Pergunta do Markdown? A) A B) B'], 'questions.md', {
      type: 'text/markdown',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput, { target: { files: [mdFile] } });

    const processBtn = screen.getByText(/Analisar Arquivo com IA e Ver Preview/i);
    fireEvent.click(processBtn);

    await waitFor(() => {
      expect(geminiModule.promptGeminiToParseDocumentToQuizJSON).toHaveBeenCalledWith(
        expect.any(String),
        'markdown',
        expect.any(Function)
      );
      expect(screen.getByText(/Pergunta do Markdown/i)).toBeDefined();
    });
  });

  it('handles PDF file import via text extraction and AI parsing', async () => {
    vi.spyOn(pdfExtractorModule, 'extractTextFromPdf').mockResolvedValueOnce(
      '--- Página 1 ---\n1. Pergunta do PDF?'
    );

    const mockAiQuestions = [
      {
        type: 'open' as const,
        question: 'Pergunta do PDF',
        options: ['', '', '', ''],
        correctIndex: 0,
        expectedAnswer: 'Gabarito oficial',
        explanation: 'Explicacao PDF',
        tags: ['PDF'],
      },
    ];

    vi.spyOn(geminiModule, 'promptGeminiToParseDocumentToQuizJSON').mockResolvedValueOnce(
      mockAiQuestions
    );

    render(<QuizImportModal isOpen={true} onClose={vi.fn()} onImport={vi.fn()} />);

    const pdfFile = new File(['%PDF-1.4 mock content'], 'simulado.pdf', {
      type: 'application/pdf',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    const processBtn = screen.getByText(/Analisar Arquivo com IA e Ver Preview/i);
    fireEvent.click(processBtn);

    await waitFor(() => {
      expect(pdfExtractorModule.extractTextFromPdf).toHaveBeenCalled();
      expect(geminiModule.promptGeminiToParseDocumentToQuizJSON).toHaveBeenCalledWith(
        expect.stringContaining('Pergunta do PDF?'),
        'pdf',
        expect.any(Function)
      );
      expect(screen.getByText(/Pergunta do PDF/i)).toBeDefined();
      expect(screen.getByText(/Gabarito oficial/i)).toBeDefined();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentAiModal } from './DocumentAiModal';
import * as aiService from '../services/documentAiService';

vi.mock('../services/documentAiService', () => ({
  sendDocumentAiPrompt: vi.fn(),
}));

describe('DocumentAiModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    documentTitle: 'artigo.md',
    documentText: '# Artigo Inicial\n\nTexto original.',
    onApplyChanges: vi.fn().mockResolvedValue(true),
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

    const input = screen.getByPlaceholderText(/Peça à IA para editar o documento/i);
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
});

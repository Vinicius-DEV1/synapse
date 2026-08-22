import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import QuestionBlockNodeView from './QuestionBlockNodeView';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: any) => (
    <div data-testid="node-view-wrapper" className={className}>
      {children}
    </div>
  ),
}));

describe('QuestionBlockNodeView Component', () => {
  let mockProps: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProps = {
      node: {
        attrs: {
          title: 'Bateria de Exercícios de Redes',
          description: 'Teste seus conhecimentos sobre TCP/IP e DNS',
          isCollapsed: false,
          mode: 'practice',
          questions: [
            {
              id: 'q1',
              type: 'multiple_choice',
              question: 'Qual a porta padrão do HTTPS?',
              options: ['80', '443', '22', '8080'],
              correctIndex: 1,
              tags: ['redes'],
              selectedIndex: null,
              expectedAnswer: '',
              userTypedAnswer: '',
              aiFeedback: null,
              explanation: 'HTTPS usa a porta 443 com TLS/SSL.',
              showExplanation: false,
              answered: false,
            },
          ],
          aiChatHistory: [],
        },
      },
      updateAttributes: vi.fn(),
    };
  });

  it('renders battery title input, questions and switches between practice and edit modes', () => {
    const { getByDisplayValue, getByText } = render(<QuestionBlockNodeView {...mockProps} />);

    expect(getByDisplayValue('Bateria de Exercícios de Redes')).toBeDefined();
    expect(getByText('Qual a porta padrão do HTTPS?')).toBeDefined();

    // Toggle mode to edit
    const editModeBtn = getByText('Editar');
    fireEvent.click(editModeBtn);

    expect(mockProps.updateAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'edit' })
    );
  });
});

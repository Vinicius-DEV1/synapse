import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import type { NodeViewProps } from '@tiptap/react';
import QuestionBlockNodeView from './QuestionBlockNodeView';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="node-view-wrapper" className={className}>
      {children}
    </div>
  ),
}));

describe('QuestionBlockNodeView Component', () => {
  let mockProps: NodeViewProps;

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
    const { getByDisplayValue, getByText, getByTitle } = render(<QuestionBlockNodeView {...mockProps} />);

    expect(getByDisplayValue('Bateria de Exercícios de Redes')).toBeDefined();
    expect(getByText('Qual a porta padrão do HTTPS?')).toBeDefined();

    // Open options menu and toggle mode to edit
    const moreOptionsBtn = getByTitle('Mais opções da bateria');
    fireEvent.click(moreOptionsBtn);

    const editModeBtn = getByText('Editar');
    fireEvent.click(editModeBtn);

    expect(mockProps.updateAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'edit' })
    );
  });

  it('does not render "Voltar ao topo da bateria" in sequential layout even with multiple questions', () => {
    const multiQuestionProps: NodeViewProps = {
      ...mockProps,
      node: {
        ...mockProps.node,
        attrs: {
          ...mockProps.node.attrs,
          layout: 'sequential',
          questions: [
            mockProps.node.attrs.questions[0],
            {
              id: 'q2',
              type: 'multiple_choice',
              question: 'Qual a porta padrão do SSH?',
              options: ['21', '22', '23', '25'],
              correctIndex: 1,
              tags: ['redes'],
              selectedIndex: null,
              expectedAnswer: '',
              userTypedAnswer: '',
              aiFeedback: null,
              explanation: 'SSH usa a porta 22.',
              showExplanation: false,
              answered: false,
            },
          ],
        },
      },
    };

    const { queryByText } = render(<QuestionBlockNodeView {...multiQuestionProps} />);
    expect(queryByText('Voltar ao topo da bateria')).toBeNull();
  });

  it('renders focus mode maximize button and opens focus modal when clicked in sequential layout', () => {
    const sequentialProps: NodeViewProps = {
      ...mockProps,
      node: {
        ...mockProps.node,
        attrs: {
          ...mockProps.node.attrs,
          layout: 'sequential',
          mode: 'practice',
        },
      },
    };

    const { getByTitle, getByText, queryByText } = render(<QuestionBlockNodeView {...sequentialProps} />);
    const focusBtn = getByTitle('Modo Foco / Maximizar');
    expect(focusBtn).toBeDefined();

    fireEvent.click(focusBtn);
    expect(getByText('Modo Foco')).toBeDefined();

    // Close focus mode via close/restore button
    const closeBtn = getByTitle('Fechar (Esc)');
    fireEvent.click(closeBtn);
    expect(queryByText('Modo Foco')).toBeNull();
  });

  it('applies overflow-visible on container when isCollapsed is true to prevent menu clipping', () => {
    const collapsedProps: NodeViewProps = {
      ...mockProps,
      node: {
        ...mockProps.node,
        attrs: {
          ...mockProps.node.attrs,
          isCollapsed: true,
        },
      },
    };

    const { getByTitle, container } = render(<QuestionBlockNodeView {...collapsedProps} />);
    const blockContainer = container.querySelector('.rounded-2xl.border');
    expect(blockContainer?.className).toContain('overflow-visible');
    expect(blockContainer?.className).not.toContain('overflow-hidden');

    const moreOptionsBtn = getByTitle('Mais opções da bateria');
    fireEvent.click(moreOptionsBtn);
    expect(container.querySelector('.absolute.right-0.top-full')).toBeDefined();
  });

  it('renders selection ring and border glow when props.selected is true', () => {
    const selectedProps: NodeViewProps = {
      ...mockProps,
      selected: true,
    };

    const { container } = render(<QuestionBlockNodeView {...selectedProps} />);
    const blockContainer = container.querySelector('.rounded-2xl.border');
    expect(blockContainer?.className).toContain('ring-2 ring-brand-400/70');
    expect(blockContainer?.className).toContain('border-brand-400/90');
  });

  it('synchronizes active question index between focus modal and inline player', () => {
    const multiQuestionSequentialProps: NodeViewProps = {
      ...mockProps,
      node: {
        ...mockProps.node,
        attrs: {
          ...mockProps.node.attrs,
          layout: 'sequential',
          mode: 'practice',
          questions: [
            mockProps.node.attrs.questions[0],
            {
              id: 'q2',
              type: 'multiple_choice',
              question: 'Qual a porta padrão do DNS?',
              options: ['53', '80', '443', '21'],
              correctIndex: 0,
              tags: ['redes'],
              selectedIndex: null,
              expectedAnswer: '',
              userTypedAnswer: '',
              aiFeedback: null,
              explanation: 'DNS usa a porta 53 UDP/TCP.',
              showExplanation: false,
              answered: false,
            },
          ],
        },
      },
    };

    const { getByTitle, getAllByText, queryByText } = render(
      <QuestionBlockNodeView {...multiQuestionSequentialProps} />
    );

    // Initially on question 1: "Qual a porta padrão do HTTPS?"
    expect(getAllByText('Qual a porta padrão do HTTPS?').length).toBeGreaterThan(0);

    // Open focus mode
    const focusBtn = getByTitle('Modo Foco / Maximizar');
    fireEvent.click(focusBtn);

    // In focus mode, advance to next question
    const nextButtons = getAllByText('Próxima Questão');
    fireEvent.click(nextButtons[nextButtons.length - 1]);

    // Question 2 should now be displayed
    expect(getAllByText('Qual a porta padrão do DNS?').length).toBeGreaterThan(0);

    // Close focus mode
    const closeBtn = getByTitle('Fechar (Esc)');
    fireEvent.click(closeBtn);
    expect(queryByText('Modo Foco')).toBeNull();

    // Inline player must now be synchronized on Question 2!
    expect(getAllByText('Qual a porta padrão do DNS?').length).toBeGreaterThan(0);
    expect(queryByText('Qual a porta padrão do HTTPS?')).toBeNull();
  });
});


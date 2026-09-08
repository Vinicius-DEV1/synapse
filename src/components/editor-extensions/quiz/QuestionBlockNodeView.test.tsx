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

vi.mock('../../../store/useStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../store/useStore')>();
  return {
    ...actual,
    useStore: () => ({
      state: { tabs: [{ id: 'tab-1' }], activeTabId: 'tab-1', pages: [] },
      dispatch: vi.fn(),
    }),
  };
});

describe('QuestionBlockNodeView (Embed Card)', () => {
  let mockProps: NodeViewProps;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProps = {
      node: {
        attrs: {
          batteryId: 'bat-123',
          cachedTitle: 'Bateria de Exercícios de Redes',
          cachedCount: 5,
          cachedTags: ['redes', 'tcp'],
          title: 'Bateria de Exercícios de Redes',
          description: 'Teste seus conhecimentos sobre TCP/IP e DNS',
        },
      } as any,
      updateAttributes: vi.fn(),
      deleteNode: vi.fn(),
    } as any;
  });

  it('renders embed card with title, question count, tags and description', () => {
    const { getByText } = render(<QuestionBlockNodeView {...mockProps} />);

    expect(getByText('Bateria de Exercícios de Redes')).toBeDefined();
    expect(getByText('5 questões')).toBeDefined();
    expect(getByText('redes')).toBeDefined();
    expect(getByText('tcp')).toBeDefined();
    expect(getByText('Teste seus conhecimentos sobre TCP/IP e DNS')).toBeDefined();
    expect(getByText('Iniciar no Modo Foco')).toBeDefined();
  });

  it('opens focus mode modal upon clicking "Iniciar no Modo Foco"', () => {
    const { getByText } = render(<QuestionBlockNodeView {...mockProps} />);

    const launchButton = getByText('Iniciar no Modo Foco');
    fireEvent.click(launchButton);

    // Modal opens and shows focus mode banner
    expect(getByText('Modo Foco')).toBeDefined();
  });

  it('opens delete confirmation dialog and calls deleteNode when confirmed', () => {
    const { getByTitle, getByText } = render(<QuestionBlockNodeView {...mockProps} />);

    const deleteBtn = getByTitle('Remover bloco da nota');
    fireEvent.click(deleteBtn);

    expect(getByText('Remover Bloco de Questões?')).toBeDefined();

    const confirmBtn = getByText('Remover da Nota');
    fireEvent.click(confirmBtn);

    expect(mockProps.deleteNode).toHaveBeenCalled();
  });
});

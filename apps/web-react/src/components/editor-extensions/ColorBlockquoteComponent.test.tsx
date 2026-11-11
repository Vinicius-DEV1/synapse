import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import ColorBlockquoteComponent from './ColorBlockquoteComponent';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className, style, 'data-color': dataColor }: any) => (
    <div data-testid="callout-wrapper" className={className} style={style} data-color={dataColor}>
      {children}
    </div>
  ),
  NodeViewContent: () => <div data-testid="callout-content" />,
  ReactNodeViewRenderer: (comp: any) => comp,
}));

describe('ColorBlockquoteComponent', () => {
  let mockProps: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProps = {
      node: {
        attrs: { color: 'default' },
        textContent: 'Callout text here',
        nodeSize: 20,
        content: { size: 18 },
      },
      editor: {
        isEditable: true,
        schema: {
          text: (t: string) => ({ type: 'text', text: t }),
        },
        chain: vi.fn(() => ({
          focus: vi.fn(() => ({
            deleteRange: vi.fn(() => ({
              insertContentAt: vi.fn(() => ({
                run: vi.fn(),
              })),
            })),
          })),
        })),
        view: { dispatch: vi.fn() },
      },
      getPos: () => 5,
      updateAttributes: vi.fn(),
      deleteNode: vi.fn(),
    };
  });

  it('renders callout toolbar with AI assistant button, color palette and actions', () => {
    const { getByTitle } = render(<ColorBlockquoteComponent {...mockProps} />);

    const aiBtn = getByTitle('Assistente de IA');
    expect(aiBtn).toBeDefined();

    const paletteBtn = getByTitle('Cor do Destaque');
    expect(paletteBtn).toBeDefined();

    const copyBtn = getByTitle('Copiar callout');
    expect(copyBtn).toBeDefined();

    const convertBtn = getByTitle('Converter em Toggle');
    expect(convertBtn).toBeDefined();

    const deleteBtn = getByTitle('Excluir Destaque');
    expect(deleteBtn).toBeDefined();
  });

  it('shows delete confirmation when delete button is clicked', () => {
    const { getByTitle, getByText } = render(<ColorBlockquoteComponent {...mockProps} />);

    const deleteBtn = getByTitle('Excluir Destaque');
    fireEvent.click(deleteBtn);

    expect(getByText(/Deseja apagar este destaque/i)).toBeDefined();

    const confirmDeleteBtn = getByText('Sim, apagar');
    fireEvent.click(confirmDeleteBtn);
    expect(mockProps.deleteNode).toHaveBeenCalled();
  });

  it('opens AI prompt modal when AI assistant button is clicked', async () => {
    const { getByTitle } = render(<ColorBlockquoteComponent {...mockProps} />);

    const aiBtn = getByTitle('Assistente de IA');
    fireEvent.click(aiBtn);

    const input = await screen.findByPlaceholderText(/Instrução para a IA/i);
    expect(input).toBeDefined();
  });
});

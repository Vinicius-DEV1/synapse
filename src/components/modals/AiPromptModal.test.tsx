import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import AiPromptModal, { type AiChatMessage } from './AiPromptModal';

// Mock gemini service
vi.mock('../../services/gemini', () => ({
  promptGemini: vi.fn().mockResolvedValue({ text: '```typescript\nconst x: number = 42;\n```' }),
}));

// Mock Portal to render inline
vi.mock('../ui/Portal', () => ({
  Portal: ({ children }: { children: React.ReactNode }) => <div data-testid="portal">{children}</div>,
}));

describe('AiPromptModal Component', () => {
  const mockOnMessageAdd = vi.fn();
  const mockOnClear = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnApplyReplacement = vi.fn();
  const mockOnInsertContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders correctly with blockBadge and blockTitle', () => {
    const { getByText, getByPlaceholderText } = render(
      <AiPromptModal
        x={100}
        y={100}
        chatId="test-chat"
        messages={[]}
        blockBadge="IA • Bloco de Código"
        blockTitle="typescript"
        targetType="code"
        onMessageAdd={mockOnMessageAdd}
        onClear={mockOnClear}
        onClose={mockOnClose}
        onApplyReplacement={mockOnApplyReplacement}
        onInsertContent={mockOnInsertContent}
      />
    );

    expect(getByText('IA • Bloco de Código')).toBeDefined();
    expect(getByText('typescript')).toBeDefined();
    expect(getByPlaceholderText('Instrução para a IA neste bloco...')).toBeDefined();
  });

  it('renders model message and allows replacing and copying code', () => {
    const messages: AiChatMessage[] = [
      { role: 'user', parts: [{ text: 'otimize este código' }] },
      {
        role: 'model',
        parts: [{ text: 'Aqui está a versão otimizada:\n```typescript\nconst total: number = 100;\n```' }],
      },
    ];

    const { getByText } = render(
      <AiPromptModal
        x={100}
        y={100}
        chatId="test-chat"
        messages={messages}
        blockBadge="IA • Bloco de Código"
        blockTitle="typescript"
        targetType="code"
        onMessageAdd={mockOnMessageAdd}
        onClear={mockOnClear}
        onClose={mockOnClose}
        onApplyReplacement={mockOnApplyReplacement}
        onInsertContent={mockOnInsertContent}
      />
    );

    const replaceBtn = getByText('Substituir Código');
    expect(replaceBtn).toBeDefined();

    fireEvent.click(replaceBtn);
    expect(mockOnApplyReplacement).toHaveBeenCalledWith('const total: number = 100;', undefined);

    const insertBtn = getByText('Inserir');
    fireEvent.click(insertBtn);
    expect(mockOnInsertContent).toHaveBeenCalledWith('const total: number = 100;');

    const copyBtn = getByText('Copiar');
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('const total: number = 100;');
  });

  it('renders toggle replacement action and parses proposed title', () => {
    const messages: AiChatMessage[] = [
      { role: 'user', parts: [{ text: 'adicione novos tópicos' }] },
      {
        role: 'model',
        parts: [
          {
            text: 'Título: Tarefas Concluídas\n```markdown\n- [x] Item 1\n- [x] Item 2\n```',
          },
        ],
      },
    ];

    const { getByText } = render(
      <AiPromptModal
        x={100}
        y={100}
        chatId="test-chat"
        messages={messages}
        blockBadge="IA • Toggle Callout"
        blockTitle="Tarefas"
        targetType="blockquoteToggle"
        onMessageAdd={mockOnMessageAdd}
        onClear={mockOnClear}
        onClose={mockOnClose}
        onApplyReplacement={mockOnApplyReplacement}
        onInsertContent={mockOnInsertContent}
      />
    );

    const replaceBtn = getByText('Substituir no Bloco');
    fireEvent.click(replaceBtn);

    expect(mockOnApplyReplacement).toHaveBeenCalledWith(
      '- [x] Item 1\n- [x] Item 2',
      'Tarefas Concluídas'
    );
  });

  it('closes when Escape key is pressed', () => {
    render(
      <AiPromptModal
        x={100}
        y={100}
        chatId="test-chat"
        messages={[]}
        onMessageAdd={mockOnMessageAdd}
        onClear={mockOnClear}
        onClose={mockOnClose}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });
});

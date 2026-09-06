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

  it('renders blockquote replacement action and extracts clean markdown proposal from preamble', () => {
    const messages: AiChatMessage[] = [
      { role: 'user', parts: [{ text: 'explique POO' }] },
      {
        role: 'model',
        parts: [
          {
            text: 'Para explicar POO mantendo o contexto, aqui está a explicação:\n```markdown\n**Conceito Rápido: O que é POO?**\n\n1. **Classes:** Moldes\n```',
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
        blockBadge="IA • Callout"
        blockTitle="Destaque"
        targetType="blockquote"
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
      '**Conceito Rápido: O que é POO?**\n\n1. **Classes:** Moldes',
      undefined
    );
  });

  it('strips leading blockquote markers (> ) from markdown proposals to avoid redundant nesting in callouts and toggles', () => {
    const messages: AiChatMessage[] = [
      { role: 'user', parts: [{ text: 'explique POO' }] },
      {
        role: 'model',
        parts: [
          {
            text: '```markdown\n> 🧩 O que é POO?\n> \n> A Programação Orientada a Objetos é um paradigma...\n> \n> 1. Encapsulamento\n```',
          },
        ],
      },
    ];

    const { getByText } = render(
      <AiPromptModal
        x={100}
        y={100}
        chatId="test-chat-anti-nest"
        messages={messages}
        blockBadge="IA • Callout"
        blockTitle="Destaque"
        targetType="blockquote"
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
      '🧩 O que é POO?\n\nA Programação Orientada a Objetos é um paradigma...\n\n1. Encapsulamento',
      undefined
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

  it('renders surgical action button and diff toggle for SEARCH/REPLACE responses', () => {
    const originalCode = 'const count = 0;\nconsole.log(count);';
    const surgicalDiffResponse = `Aqui está a correção solicitada:
<<<<<<< SEARCH
console.log(count);
=======
console.log("Count is:", count);
>>>>>>>`;

    const messages: AiChatMessage[] = [
      {
        role: 'user',
        parts: [{ text: 'Melhore a linha do console.log' }],
      },
      {
        role: 'model',
        parts: [{ text: surgicalDiffResponse }],
      },
    ];

    const { getByText, queryByText } = render(
      <AiPromptModal
        x={100}
        y={100}
        chatId="test-chat"
        messages={messages}
        originalContent={originalCode}
        blockBadge="IA • Bloco de Código"
        blockTitle="javascript"
        targetType="code"
        onMessageAdd={mockOnMessageAdd}
        onClear={mockOnClear}
        onClose={mockOnClose}
        onApplyReplacement={mockOnApplyReplacement}
        onInsertContent={mockOnInsertContent}
      />
    );

    // Should display surgical action button with hunk count
    const surgicalBtn = getByText('Aplicar Cirurgicamente (1)');
    expect(surgicalBtn).toBeDefined();

    // Should display "Ver Diff" button
    const diffBtn = getByText('Ver Diff');
    expect(diffBtn).toBeDefined();

    // Clicking "Ver Diff" toggles diff view
    fireEvent.click(diffBtn);
    expect(getByText('Comparação de Modificações')).toBeDefined();
    expect(getByText('Ver Texto')).toBeDefined();

    // Clicking "Aplicar Cirurgicamente (1)" calls onApplyReplacement
    fireEvent.click(surgicalBtn);
    expect(mockOnApplyReplacement).toHaveBeenCalledWith(surgicalDiffResponse, undefined);
  });
});

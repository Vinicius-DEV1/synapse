import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlockAiModal } from './useBlockAiModal';

describe('useBlockAiModal Hook', () => {
  let mockEditor: any;
  let mockNode: any;
  let mockGetPos: any;
  let mockUpdateAttributes: any;
  let mockDeleteRange: any;
  let mockInsertContentAt: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockNode = {
      attrs: { title: 'Destaque Importante', language: 'typescript' },
      textContent: 'console.log("hello");',
      nodeSize: 25,
      content: {
        size: 23,
      },
    };

    mockGetPos = vi.fn(() => 5);
    mockUpdateAttributes = vi.fn();

    const mockTr = {
      replaceWith: vi.fn(),
      insert: vi.fn(),
    };

    const mockSchema = {
      text: vi.fn((text: string) => ({ type: 'text', text })),
    };

    mockInsertContentAt = vi.fn(() => ({ run: vi.fn() }));
    mockDeleteRange = vi.fn(() => ({ insertContentAt: mockInsertContentAt }));

    mockEditor = {
      state: {
        tr: mockTr,
        schema: mockSchema,
      },
      view: {
        dispatch: vi.fn(),
      },
      schema: mockSchema,
      chain: vi.fn(() => ({
        focus: vi.fn(() => ({
          deleteRange: mockDeleteRange,
          insertContentAt: mockInsertContentAt,
        })),
      })),
    };
  });

  it('builds context with strict bounding prompt for code blocks', () => {
    const { result } = renderHook(() =>
      useBlockAiModal({
        editor: mockEditor,
        node: mockNode,
        getPos: mockGetPos,
        updateAttributes: mockUpdateAttributes,
        blockType: 'codeBlock',
      })
    );

    expect(result.current.blockBadge).toBe('IA • Bloco de Código');
    expect(result.current.blockTitle).toBe('typescript');
    expect(result.current.targetType).toBe('code');
    expect(result.current.contextText).toContain('Tipo: Bloco de Código');
    expect(result.current.contextText).toContain('Linguagem: typescript');
    expect(result.current.contextText).toContain('console.log("hello");');
    expect(result.current.contextText).toContain('REGRAS E LIMITES MANDATÓRIOS');
    expect(result.current.contextText).toContain('RESPEITO RIGOROSO À SINTAXE');
    expect(result.current.contextText).toContain('COMENTÁRIOS OBRIGATÓRIOS DA LINGUAGEM');
    expect(result.current.contextText).toContain('NUNCA tente editar, adicionar ou alterar conteúdo fora deste bloco');
    expect(result.current.systemInstruction).toContain('linguagem "typescript"');
    expect(result.current.systemInstruction).toContain('use SEMPRE os comentários da linguagem');
  });

  it('builds context with strict bounding prompt for toggle callouts', () => {
    const { result } = renderHook(() =>
      useBlockAiModal({
        editor: mockEditor,
        node: mockNode,
        getPos: mockGetPos,
        updateAttributes: mockUpdateAttributes,
        blockType: 'blockquoteToggle',
      })
    );

    expect(result.current.blockBadge).toBe('IA • Toggle Callout');
    expect(result.current.blockTitle).toBe('Destaque Importante');
    expect(result.current.targetType).toBe('blockquoteToggle');
    expect(result.current.contextText).toContain('Tipo: Toggle Callout (Destaque Recolhível)');
    expect(result.current.contextText).toContain('Título atual: "Destaque Importante"');
    expect(result.current.contextText).toContain('NUNCA tente editar, remover ou adicionar conteúdo fora deste bloco');
  });

  it('builds context with strict bounding prompt for toggle blocks', () => {
    const { result } = renderHook(() =>
      useBlockAiModal({
        editor: mockEditor,
        node: mockNode,
        getPos: mockGetPos,
        updateAttributes: mockUpdateAttributes,
        blockType: 'toggleBlock',
      })
    );

    expect(result.current.blockBadge).toBe('IA • Lista Oculta');
    expect(result.current.targetType).toBe('toggle');
    expect(result.current.contextText).toContain('Tipo: Toggle (Lista Oculta)');
  });

  it('builds context with strict bounding prompt for standard callout (blockquote)', () => {
    mockNode.textContent = 'Texto de alerta do callout';
    const { result } = renderHook(() =>
      useBlockAiModal({
        editor: mockEditor,
        node: mockNode,
        getPos: mockGetPos,
        updateAttributes: mockUpdateAttributes,
        blockType: 'blockquote',
      })
    );

    expect(result.current.blockBadge).toBe('IA • Callout');
    expect(result.current.blockTitle).toBe('Destaque');
    expect(result.current.targetType).toBe('blockquote');
    expect(result.current.contextText).toContain('Tipo: Callout (Destaque)');
    expect(result.current.contextText).toContain('Texto de alerta do callout');
    expect(result.current.contextText).toContain('NUNCA tente editar, remover ou adicionar conteúdo fora deste bloco');
  });

  it('replaces content inside blockquote atomically', () => {
    const { result } = renderHook(() =>
      useBlockAiModal({
        editor: mockEditor,
        node: mockNode,
        getPos: mockGetPos,
        updateAttributes: mockUpdateAttributes,
        blockType: 'blockquote',
      })
    );

    act(() => {
      result.current.handleApplyReplacement('**Conceito Rápido: O que é POO?**\n\n1. **Classes:** Moldes');
    });

    expect(mockEditor.chain).toHaveBeenCalled();
    expect(mockDeleteRange).toHaveBeenCalledWith({ from: 6, to: 29 });
    expect(mockInsertContentAt).toHaveBeenCalledWith(
      6,
      expect.stringContaining('<strong>Conceito Rápido: O que é POO?</strong>')
    );
  });

  it('replaces content inside blockquote stripping any leading quote markers and preventing nested blockquotes', () => {
    const { result } = renderHook(() =>
      useBlockAiModal({
        editor: mockEditor,
        node: mockNode,
        getPos: mockGetPos,
        updateAttributes: mockUpdateAttributes,
        blockType: 'blockquote',
      })
    );

    act(() => {
      result.current.handleApplyReplacement('> 🧩 **O que é POO?**\n> \n> A Programação Orientada a Objetos...');
    });

    expect(mockInsertContentAt).toHaveBeenCalledWith(
      6,
      expect.not.stringContaining('<blockquote>')
    );
    expect(mockInsertContentAt).toHaveBeenCalledWith(
      6,
      expect.stringContaining('<strong>O que é POO?</strong>')
    );
  });


  it('replaces code content inside code block atomically', () => {
    mockNode.attrs.language = 'auto';
    const { result } = renderHook(() =>
      useBlockAiModal({
        editor: mockEditor,
        node: mockNode,
        getPos: mockGetPos,
        updateAttributes: mockUpdateAttributes,
        blockType: 'codeBlock',
      })
    );

    act(() => {
      result.current.handleApplyReplacement('```python\nprint("nova versao")\n```');
    });

    expect(mockUpdateAttributes).toHaveBeenCalledWith({ language: 'python' });
    expect(mockEditor.state.tr.replaceWith).toHaveBeenCalledWith(
      6, // pos (5) + 1 + minimalDiff.from (0)
      27, // pos (5) + 1 + minimalDiff.to (21 = original text length)
      [{ type: 'text', text: 'print("nova versao")' }]
    );
    expect(mockEditor.view.dispatch).toHaveBeenCalled();
  });

  it('exposes originalContent correctly', () => {
    const { result } = renderHook(() =>
      useBlockAiModal({
        editor: mockEditor,
        node: mockNode,
        getPos: mockGetPos,
        updateAttributes: mockUpdateAttributes,
        blockType: 'codeBlock',
      })
    );

    expect(result.current.originalContent).toBe('console.log("hello");');
  });

  it('applies surgical SEARCH/REPLACE blocks in code block with minimal range', () => {
    const { result } = renderHook(() =>
      useBlockAiModal({
        editor: mockEditor,
        node: mockNode,
        getPos: mockGetPos,
        updateAttributes: mockUpdateAttributes,
        blockType: 'codeBlock',
      })
    );

    act(() => {
      result.current.handleApplyReplacement(`
<<<<<<< SEARCH
console.log("hello");
=======
console.log("world");
>>>>>>>
      `);
    });

    // Minimal diff range for changing "hello" to "world":
    // "console.log(\"" is 13 chars.
    // pos = 5.
    // 5 + 1 + 13 = 19 (from)
    // 5 + 1 + 18 = 24 (to)
    expect(mockEditor.state.tr.replaceWith).toHaveBeenCalledWith(
      19,
      24,
      [{ type: 'text', text: 'world' }]
    );
    expect(mockEditor.view.dispatch).toHaveBeenCalled();
  });

  it('replaces content in toggle and updates title if proposed', () => {
    const { result } = renderHook(() =>
      useBlockAiModal({
        editor: mockEditor,
        node: mockNode,
        getPos: mockGetPos,
        updateAttributes: mockUpdateAttributes,
        blockType: 'blockquoteToggle',
      })
    );

    act(() => {
      result.current.handleApplyReplacement('Novo conteúdo para o toggle', 'Título Atualizado');
    });

    expect(mockUpdateAttributes).toHaveBeenCalledWith({ title: 'Título Atualizado' });
    expect(mockEditor.chain).toHaveBeenCalled();
  });

  it('handles opening and closing the AI modal', () => {
    const { result } = renderHook(() =>
      useBlockAiModal({
        editor: mockEditor,
        node: mockNode,
        getPos: mockGetPos,
        updateAttributes: mockUpdateAttributes,
        blockType: 'codeBlock',
      })
    );

    expect(result.current.isOpen).toBe(false);

    const mockEvent = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
      currentTarget: {
        getBoundingClientRect: () => ({ left: 100, width: 30, bottom: 200 }),
      },
    } as any;

    act(() => {
      result.current.handleOpenAi(mockEvent);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.anchorPos).toEqual({ x: 115, y: 206 });

    act(() => {
      result.current.handleCloseAi();
    });

    expect(result.current.isOpen).toBe(false);
  });
});

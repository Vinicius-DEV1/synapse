import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import Editor from './Editor';
import { FocusProvider } from '../store/FocusContext';

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn((options) => ({
    commands: {
      setContent: vi.fn(),
      setTextSelection: vi.fn(),
    },
    state: {
      selection: { $head: { pos: 0 } },
      doc: { nodeAt: vi.fn() },
    },
    view: {
      dom: document.createElement('div'),
      posAtDOM: vi.fn(),
      editable: true,
    },
    on: vi.fn(),
    off: vi.fn(),
    isActive: vi.fn().mockReturnValue(false),
    isEmpty: false,
    getHTML: () => '<p>Conteúdo de teste</p>',
    isDestroyed: false,
    options,
  })),
  EditorContent: ({ editor }: any) => (
    <div data-testid="editor-content">{editor ? 'Editor Rendered' : 'No Editor'}</div>
  ),
}));

vi.mock('@tiptap/react/menus', () => ({
  BubbleMenu: ({ children }: any) => <div data-testid="bubble-menu">{children}</div>,
}));

vi.mock('./editor/components/FloatingToolbar', () => ({
  default: () => <div data-testid="floating-toolbar">FloatingToolbar</div>,
}));

vi.mock('./editor/components/TableToolbar', () => ({
  default: () => <div data-testid="table-toolbar">TableToolbar</div>,
}));

vi.mock('./BlockHandle', () => ({
  default: () => <div data-testid="block-handle">BlockHandle</div>,
}));

vi.mock('./editor/components/EditorModalHost', () => ({
  default: () => <div data-testid="editor-modal-host">EditorModalHost</div>,
}));

describe('Editor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders editor container and modal host successfully', () => {
    const onSave = vi.fn();

    const { getByTestId } = render(
      <FocusProvider>
        <Editor
          pageId="page-1"
          pageTitle="Minha Página"
          initialContent="<p>Olá Mundo</p>"
          onSave={onSave}
        />
      </FocusProvider>
    );

    expect(getByTestId('editor-content')).toBeDefined();
    expect(getByTestId('editor-modal-host')).toBeDefined();
  });
});

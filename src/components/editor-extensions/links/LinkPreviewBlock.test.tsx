import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { LinkPreviewBlock } from './LinkPreviewBlock';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: any) => (
    <div data-testid="link-preview-wrapper" className={className}>
      {children}
    </div>
  ),
  ReactNodeViewRenderer: (component: any) => component,
}));

describe('LinkPreviewBlock Component', () => {
  let mockProps: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProps = {
      node: {
        attrs: {
          url: 'https://github.com/google/antigravity',
          title: 'Google Antigravity Repository',
          isLoading: false,
          channel: 'Google Deepmind',
          duration: null,
          isPlaylist: false,
          uploadDate: null,
          notes: 'Anotações sobre a arquitetura do projeto',
          showNotes: false,
        },
      },
      editor: {
        view: { state: { doc: {} } },
      },
      updateAttributes: vi.fn(),
      getPos: () => 15,
    };
  });

  it('renders link title, channel and handles notes toggle', () => {
    const Component = (LinkPreviewBlock.config.addNodeView as any)();
    const { getByText, getByTitle } = render(<Component {...mockProps} />);

    expect(getByText('Google Antigravity Repository')).toBeDefined();
    expect(getByText('Google Deepmind')).toBeDefined();

    // Toggle notes button
    const notesBtn = getByTitle(/Expandir Anotações do Link/i);
    expect(notesBtn).toBeDefined();
    fireEvent.click(notesBtn);

    expect(mockProps.updateAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ showNotes: true })
    );
  });
});

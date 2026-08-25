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

  it('handles watched toggle button click', () => {
    const Component = (LinkPreviewBlock.config.addNodeView as any)();
    const { getByTitle } = render(<Component {...mockProps} />);

    const watchedBtn = getByTitle(/Marcar como assistido/i);
    expect(watchedBtn).toBeDefined();
    fireEvent.click(watchedBtn);

    expect(mockProps.updateAttributes).toHaveBeenCalledWith(
      expect.objectContaining({ watched: true })
    );
  });

  it('renders playlist with video count, date range and Ver Playlist button', () => {
    const playlistProps = {
      ...mockProps,
      node: {
        attrs: {
          url: 'https://youtube.com/playlist?list=PL12345',
          title: 'Análise de Algoritmos',
          isLoading: false,
          channel: 'João Paulo Leite',
          duration: null,
          isPlaylist: true,
          playlistCount: 18,
          uploadDate: '20210310 - 20231120',
          notes: '',
          showNotes: false,
        },
      },
    };

    const Component = (LinkPreviewBlock.config.addNodeView as any)();
    const { getByText } = render(<Component {...playlistProps} />);

    expect(getByText('Análise de Algoritmos')).toBeDefined();
    expect(getByText('João Paulo Leite')).toBeDefined();
    expect(getByText(/18 vídeos/i)).toBeDefined();
    expect(getByText('10/03/2021 – 20/11/2023')).toBeDefined();
    expect(getByText('Ver Playlist')).toBeDefined();
  });

  it('preserves border class and sets borderColor when custom color is selected', () => {
    const customColorProps = {
      ...mockProps,
      node: {
        attrs: {
          ...mockProps.node.attrs,
          color: '#8b5cf6',
        },
      },
    };

    const Component = (LinkPreviewBlock.config.addNodeView as any)();
    const { container } = render(<Component {...customColorProps} />);

    const card = container.querySelector('.rounded-lg.border');
    expect(card).toBeDefined();
    expect(card?.getAttribute('style')).toContain('border-color');
    expect(card?.className).toContain('border');
  });
});


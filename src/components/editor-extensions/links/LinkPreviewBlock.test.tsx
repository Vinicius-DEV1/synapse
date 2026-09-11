import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { LinkPreviewBlock } from './LinkPreviewBlock';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: any) => (
    <div data-testid="link-preview-wrapper" className={className}>
      {children}
    </div>
  ),
  ReactNodeViewRenderer: (component: any) => component,
}));

vi.mock('./hooks/useLinkDuplicates', () => ({
  useLinkDuplicates: vi.fn(() => ({ duplicatePages: [], isSearching: false })),
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
    const { getByTitle, getByText } = render(<Component {...mockProps} />);

    const moreBtn = getByTitle(/Mais opções do link/i);
    expect(moreBtn).toBeDefined();
    fireEvent.click(moreBtn);

    const watchedBtn = getByText(/Marcar como concluído/i);
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

  it('copies link URL to clipboard when clicking copy button', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const Component = (LinkPreviewBlock.config.addNodeView as any)();
    const { getByTitle, getByText } = render(<Component {...mockProps} />);

    const moreBtn = getByTitle(/Mais opções do link/i);
    expect(moreBtn).toBeDefined();
    fireEvent.click(moreBtn);

    const copyBtn = getByText(/Copiar Link Original/i);
    expect(copyBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith('https://github.com/google/antigravity');
  });

  it('displays offline saved badge when scrap is ready and opens scrap modal', () => {
    const scrapProps = {
      ...mockProps,
      node: {
        attrs: {
          ...mockProps.node.attrs,
          scrapId: 'scrap_123',
          scrapStatus: 'ready',
        },
      },
    };

    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    const Component = (LinkPreviewBlock.config.addNodeView as any)();
    const { getByText } = render(<Component {...scrapProps} />);

    const scrapBadge = getByText('Offline Salvo');
    expect(scrapBadge).toBeDefined();

    fireEvent.click(scrapBadge);
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'caderno-open-scrap-action',
      })
    );
  });

  it('allows 1-click copying of URL directly inside the external link modal', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const Component = (LinkPreviewBlock.config.addNodeView as any)();
    const { getByText, findByText, getByTitle } = render(<Component {...mockProps} />);

    // Click card to open external link modal
    const cardTitle = getByText('Google Antigravity Repository');
    fireEvent.click(cardTitle);

    // Modal should be visible
    expect(await findByText('Abrir Link Externo')).toBeDefined();
    expect(getByText(/Deseja abrir o seguinte link no seu navegador padrão\?/i)).toBeDefined();

    // Click the 1-click copy button inside the modal
    const copyButtonInModal = getByText('Copiar');
    expect(copyButtonInModal).toBeDefined();

    await act(async () => {
      fireEvent.click(copyButtonInModal);
    });

    expect(writeTextMock).toHaveBeenCalledWith('https://github.com/google/antigravity');
    expect(await findByText('Copiado!')).toBeDefined();

    // Reset mock and verify clicking the URL container itself also triggers 1-click copy
    writeTextMock.mockClear();
    const urlText = getByText('https://github.com/google/antigravity');
    await act(async () => {
      fireEvent.click(urlText);
    });
    expect(writeTextMock).toHaveBeenCalledWith('https://github.com/google/antigravity');
  });

  it('displays duplicate indicator badge when link is found in other pages and opens modal on click', async () => {
    const { useLinkDuplicates } = await import('./hooks/useLinkDuplicates');
    vi.mocked(useLinkDuplicates).mockReturnValue({
      duplicatePages: [
        {
          id: 'page-dup-1',
          title: 'Anotações de IA',
          icon: '🤖',
          ancestors: [{ id: 'parent-1', title: 'Estudos' }],
        },
      ],
      isSearching: false,
    });

    const Component = (LinkPreviewBlock.config.addNodeView as any)();
    const { getByText, findByText } = render(<Component {...mockProps} />);

    // Duplicate badge should be displayed
    const badge = getByText('Em 1 outra página');
    expect(badge).toBeDefined();

    // Clicking badge opens the clean duplicates modal
    fireEvent.click(badge);
    expect(await findByText('Link já utilizado no Caderno')).toBeDefined();
    expect(getByText('Anotações de IA')).toBeDefined();
    expect(getByText('OK, Entendido')).toBeDefined();
  });

  it('opens summary modal from ••• menu for YouTube video links', async () => {
    const ytProps = {
      ...mockProps,
      node: {
        attrs: {
          url: 'https://www.youtube.com/watch?v=react123',
          title: 'Aprenda React em 10 Minutos',
          channel: 'Canal Dev',
          duration: 600,
          isPlaylist: false,
          notes: '',
          showNotes: false,
        },
      },
    };

    const Component = (LinkPreviewBlock.config.addNodeView as any)();
    const { getByTitle, findByText } = render(<Component {...ytProps} />);

    // Open ••• menu
    const moreButton = getByTitle('Mais opções do link (•••)');
    fireEvent.click(moreButton);

    const summaryButton = await findByText('Resumo do Vídeo');
    expect(summaryButton).toBeDefined();

    fireEvent.click(summaryButton);

    // YouTubeSummaryModal should be rendered
    expect(await findByText('IA Didática')).toBeDefined();
  });

  it('displays "Assistir Aqui" button for YouTube video links and opens watch modal on click', async () => {
    const ytProps = {
      ...mockProps,
      node: {
        attrs: {
          url: 'https://www.youtube.com/watch?v=react123',
          title: 'Aprenda React em 10 Minutos',
          channel: 'Canal Dev',
          duration: 600,
          isPlaylist: false,
          notes: '',
          showNotes: false,
        },
      },
    };

    (window as any).api = {
      youtube: {
        getStream: vi.fn().mockResolvedValue({
          title: 'Aprenda React em 10 Minutos',
          resolution: '1280x720',
          duration: 600,
          video_url: 'https://googlevideo.com/video_720p.mp4',
        }),
      },
    };

    const Component = (LinkPreviewBlock.config.addNodeView as any)();
    const { getByTitle, findByText, getByText } = render(<Component {...ytProps} />);

    // Open the ••• menu
    const moreButton = getByTitle('Mais opções do link (•••)');
    fireEvent.click(moreButton);

    const watchButton = await findByText('Assistir Aqui');
    expect(watchButton).toBeDefined();

    fireEvent.click(watchButton);

    // YouTubeWatchModal should be rendered with 720p badge
    expect(await findByText('yt-dlp stream')).toBeDefined();
    expect(getByText('1280x720')).toBeDefined();
  });
});


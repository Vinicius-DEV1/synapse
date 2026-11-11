import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MediaWidgetNodeView from './MediaWidgetNodeView';

vi.mock('@tiptap/react', () => ({
  NodeViewWrapper: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

describe('MediaWidgetNodeView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      sync: {
        getTable: vi.fn().mockResolvedValue([
          { id: 'video_1', title: 'Aula de TypeScript', deleted_at: null },
        ]),
      },
      library: {
        getBooks: vi.fn().mockResolvedValue([
          { id: 'book_1', title: 'Clean Code', deleted_at: null },
        ]),
      },
    };
  });

  it('renders video widget normally and opens media action on click', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    render(
      <MediaWidgetNodeView
        node={{
          attrs: {
            mediaId: 'video_1',
            mediaType: 'video',
            title: 'Aula de TypeScript',
          },
        }}
        deleteNode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Aula de TypeScript')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Aula de TypeScript'));

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'open-media-action',
        detail: { mediaId: 'video_1', mediaType: 'video', title: 'Aula de TypeScript' },
      })
    );
  });

  it('renders deleted state in red with (Excluído) when video is not found', async () => {
    (window as any).api.sync.getTable = vi.fn().mockResolvedValue([]);

    render(
      <MediaWidgetNodeView
        node={{
          attrs: {
            mediaId: 'video_deleted',
            mediaType: 'video',
            title: 'Video Apagado',
          },
        }}
        deleteNode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Video Apagado (Excluído)')).toBeInTheDocument();
    });
  });

  it('shows deleted notice modal on click and allows removing the widget', async () => {
    (window as any).api.sync.getTable = vi.fn().mockResolvedValue([]);
    const deleteNodeMock = vi.fn();

    render(
      <MediaWidgetNodeView
        node={{
          attrs: {
            mediaId: 'video_deleted',
            mediaType: 'video',
            title: 'Video Apagado',
          },
        }}
        deleteNode={deleteNodeMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Video Apagado (Excluído)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Video Apagado (Excluído)'));

    expect(screen.getByText('Vídeo Excluído')).toBeInTheDocument();
    expect(screen.getByText('Remover Widget')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Remover Widget'));
    expect(deleteNodeMock).toHaveBeenCalledTimes(1);
  });
});

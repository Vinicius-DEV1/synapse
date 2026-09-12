import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import YouTubePlaylistItemActions from './YouTubePlaylistItemActions';
import type { YouTubeVideoItem } from './youtubePlaylistHelper';

vi.mock('../../ui/ToastContext', () => ({
  triggerToast: vi.fn(),
}));

describe('YouTubePlaylistItemActions', () => {
  const mockVideo: YouTubeVideoItem = {
    id: 'vid123',
    title: 'Aula de React 19',
    channel: 'Dev Channel',
    duration: 300,
  };

  it('renders quick hover summary pill and triggers onOpenSummary when clicked', () => {
    const onOpenSummary = vi.fn();
    const onToggleWatched = vi.fn();

    render(
      <YouTubePlaylistItemActions
        video={mockVideo}
        isWatched={false}
        onToggleWatched={onToggleWatched}
        onOpenSummary={onOpenSummary}
      />
    );

    const summaryBtn = screen.getByRole('button', { name: /resumo/i });
    expect(summaryBtn).toBeInTheDocument();
    expect(summaryBtn).toHaveAttribute('title', 'Resumo do Vídeo com IA');

    fireEvent.click(summaryBtn);
    expect(onOpenSummary).toHaveBeenCalledTimes(1);
  });

  it('toggles watched status when watched button is clicked', () => {
    const onToggleWatched = vi.fn();

    const { rerender } = render(
      <YouTubePlaylistItemActions
        video={mockVideo}
        isWatched={false}
        onToggleWatched={onToggleWatched}
        onOpenSummary={vi.fn()}
      />
    );

    const watchedBtn = screen.getByTitle('Marcar como assistido');
    fireEvent.click(watchedBtn);
    expect(onToggleWatched).toHaveBeenCalledTimes(1);

    rerender(
      <YouTubePlaylistItemActions
        video={mockVideo}
        isWatched={true}
        onToggleWatched={onToggleWatched}
        onOpenSummary={vi.fn()}
      />
    );

    expect(screen.getByTitle('Marcar como não assistido')).toBeInTheDocument();
  });

  it('opens contextual dropdown menu and triggers actions', () => {
    const onWatch = vi.fn();
    const onOpenSummary = vi.fn();

    render(
      <YouTubePlaylistItemActions
        video={mockVideo}
        isWatched={false}
        onToggleWatched={vi.fn()}
        onOpenSummary={onOpenSummary}
        onWatch={onWatch}
      />
    );

    // Click more options menu button
    const menuBtn = screen.getByTitle('Mais opções do vídeo');
    fireEvent.click(menuBtn);

    // Watch modal action in dropdown
    const watchOption = screen.getByRole('button', { name: /assistir aqui/i });
    expect(watchOption).toBeInTheDocument();
    fireEvent.click(watchOption);
    expect(onWatch).toHaveBeenCalledTimes(1);

    // Reopen menu for summary option in dropdown
    fireEvent.click(menuBtn);
    const dropdownSummaryOption = screen.getAllByText(/resumo do vídeo/i)[0];
    fireEvent.click(dropdownSummaryOption);
    expect(onOpenSummary).toHaveBeenCalledTimes(1);
  });
});

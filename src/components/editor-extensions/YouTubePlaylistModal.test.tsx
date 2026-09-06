import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import YouTubePlaylistModal from './YouTubePlaylistModal';

describe('YouTubePlaylistModal', () => {
  const mockOnClose = vi.fn();
  const sampleUrl = 'https://www.youtube.com/playlist?list=PLtest123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.api
    window.api = {
      youtube: {
        fetchPlaylistInfo: vi.fn().mockResolvedValue({
          _type: 'playlist',
          title: 'Orientação a objetos com C# - 2024',
          entries: [
            {
              id: 'vid1',
              title: 'C# Aula 01 - Introdução',
              uploader: 'Canal Dev',
              duration: 181,
              timestamp: 1715731200, // 15/05/2024
              availability: 'public',
            },
            {
              id: 'vid2',
              title: 'C# Aula 02 - Membros Only',
              uploader: 'Canal Dev',
              duration: 368,
              upload_date: '20240516', // 16/05/2024
              availability: 'subscriber_only',
            },
            {
              id: 'vid3',
              title: 'C# Aula 03 [Membros] - Exercícios',
              uploader: 'Canal Dev',
              duration: 240,
              availability: 'public',
            },
          ],
        }),
        getWatched: vi.fn().mockResolvedValue(['vid1']),
        setWatched: vi.fn().mockResolvedValue(true),
      },
    } as any;
  });

  it('renders playlist header, progress and videos with formatted release date and members tag', async () => {
    render(
      <YouTubePlaylistModal
        url={sampleUrl}
        title="Orientação a objetos com C# - 2024"
        onClose={mockOnClose}
      />
    );

    // Should render playlist title
    expect(await screen.findByText('Orientação a objetos com C# - 2024')).toBeDefined();

    // Should render video titles
    expect(screen.getByText('C# Aula 01 - Introdução')).toBeDefined();
    expect(screen.getByText('C# Aula 02 - Membros Only')).toBeDefined();
    expect(screen.getByText('C# Aula 03 [Membros] - Exercícios')).toBeDefined();

    // Should display release dates in DD/MM/YYYY format
    expect(screen.getByText('15/05/2024')).toBeDefined();
    expect(screen.getByText('16/05/2024')).toBeDefined();

    // Should render "Membros" tag for members-only videos
    const membersTags = screen.getAllByText('Membros');
    expect(membersTags.length).toBe(2); // vid2 (subscriber_only) and vid3 ([Membros] in title)
  });

  it('closes modal when Escape key is pressed', async () => {
    render(
      <YouTubePlaylistModal
        url={sampleUrl}
        title="Orientação a objetos com C# - 2024"
        onClose={mockOnClose}
      />
    );

    await screen.findByText('Orientação a objetos com C# - 2024');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('toggles video watched status when check button is clicked', async () => {
    render(
      <YouTubePlaylistModal
        url={sampleUrl}
        title="Orientação a objetos com C# - 2024"
        onClose={mockOnClose}
      />
    );

    await screen.findByText('C# Aula 02 - Membros Only');

    const markWatchedBtns = screen.getAllByTitle('Marcar como assistido');
    fireEvent.click(markWatchedBtns[0]);

    expect(window.api.youtube.setWatched).toHaveBeenCalledWith(
      'vid2',
      true,
      'C# Aula 02 - Membros Only',
      'Canal Dev'
    );
  });
});

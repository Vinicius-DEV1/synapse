import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import YouTubeWatchModal from './YouTubeWatchModal';

describe('YouTubeWatchModal', () => {
  const mockOnClose = vi.fn();
  const sampleUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and then shows the video player', async () => {
    const mockGetStream = vi.fn().mockResolvedValue({
      title: 'Rick Astley - Never Gonna Give You Up',
      resolution: '1280x720',
      duration: 213,
      video_url: 'https://googlevideo.com/video_720p.mp4',
      audio_url: 'https://googlevideo.com/audio.m4a',
    });

    (window as any).api = {
      youtube: {
        getStream: mockGetStream,
      },
      os: {
        openInBrowser: vi.fn(),
      },
    };

    render(
      <YouTubeWatchModal
        url={sampleUrl}
        title="Rick Astley"
        channel="RickAstleyVEVO"
        onClose={mockOnClose}
      />
    );

    // Initial loading status
    expect(screen.getByText(/Conectando stream 720p via yt-dlp/i)).toBeDefined();

    // After resolving stream info
    expect(await screen.findByText('Rick Astley - Never Gonna Give You Up')).toBeDefined();
    expect(screen.getByText('1280x720')).toBeDefined();
    expect(screen.getByText('yt-dlp stream')).toBeDefined();
    expect(screen.getByText('RickAstleyVEVO')).toBeDefined();

    // Verify video and audio elements exist
    const video = document.querySelector('video');
    expect(video).toBeDefined();
    expect(video?.getAttribute('src')).toBe('https://googlevideo.com/video_720p.mp4');

    const audio = document.querySelector('audio');
    expect(audio).toBeDefined();
    expect(audio?.getAttribute('src')).toBe('https://googlevideo.com/audio.m4a');
  });

  it('handles error state gracefully with retry and embed fallback buttons', async () => {
    const mockGetStream = vi.fn().mockRejectedValue(new Error('Vídeo restrito por direitos autorais'));

    (window as any).api = {
      youtube: {
        getStream: mockGetStream,
      },
    };

    render(
      <YouTubeWatchModal
        url={sampleUrl}
        title="Vídeo com Erro"
        onClose={mockOnClose}
      />
    );

    expect(await screen.findByText(/Não foi possível reproduzir via streaming nativo/i)).toBeDefined();
    expect(screen.getByText(/Vídeo restrito por direitos autorais/i)).toBeDefined();
    expect(screen.getByText(/Tentar Novamente/i)).toBeDefined();
    expect(screen.getByText(/Usar Player Embutido/i)).toBeDefined();
    expect(screen.getByText(/Assistir no YouTube/i)).toBeDefined();

    // Clicking embed fallback should render iframe
    fireEvent.click(screen.getByText(/Usar Player Embutido/i));
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeDefined();
    expect(iframe?.getAttribute('src')).toContain('dQw4w9WgXcQ');
  });

  it('allows toggling between native stream and embed player via header button', async () => {
    const mockGetStream = vi.fn().mockResolvedValue({
      title: 'Rick Astley - Never Gonna Give You Up',
      resolution: '1280x720',
      duration: 213,
      video_url: 'https://googlevideo.com/video_720p.mp4',
    });

    (window as any).api = {
      youtube: { getStream: mockGetStream },
    };

    render(
      <YouTubeWatchModal
        url={sampleUrl}
        title="Rick Astley"
        onClose={mockOnClose}
      />
    );

    expect(await screen.findByText('Rick Astley - Never Gonna Give You Up')).toBeDefined();
    expect(document.querySelector('video')).not.toBeNull();

    // Toggle to embed player via header
    const toggleBtn = screen.getByTitle(/Alternar para Player Embutido/i);
    expect(toggleBtn).toBeDefined();
    fireEvent.click(toggleBtn);

    // Verify iframe is rendered and video element is discarded
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeDefined();
    expect(iframe?.getAttribute('src')).toContain('dQw4w9WgXcQ');
    expect(document.querySelector('video')).toBeNull();
  });

  it('triggers onClose when close button is clicked or Escape is pressed', async () => {
    const mockGetStream = vi.fn().mockResolvedValue({
      title: 'Rick Astley',
      resolution: '720p',
      duration: 213,
      video_url: 'https://googlevideo.com/video.mp4',
    });

    (window as any).api = {
      youtube: { getStream: mockGetStream },
    };

    render(
      <YouTubeWatchModal
        url={sampleUrl}
        title="Rick Astley"
        onClose={mockOnClose}
      />
    );

    await waitFor(() => expect(screen.getByTitle(/Fechar \(Esc\)/i)).toBeDefined());

    // Click close button
    fireEvent.click(screen.getByTitle(/Fechar \(Esc\)/i));
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    // Press Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });

  it('performs strict memory cleanup on unmount', async () => {
    const mockGetStream = vi.fn().mockResolvedValue({
      title: 'Rick Astley',
      resolution: '720p',
      duration: 213,
      video_url: 'https://googlevideo.com/video.mp4',
      audio_url: 'https://googlevideo.com/audio.m4a',
    });

    (window as any).api = {
      youtube: { getStream: mockGetStream },
    };

    const pauseSpy = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    const loadSpy = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});

    const { unmount } = render(
      <YouTubeWatchModal
        url={sampleUrl}
        title="Rick Astley"
        onClose={mockOnClose}
      />
    );

    // Wait until stream has loaded and video is rendered in DOM
    expect(await screen.findByText('Rick Astley')).toBeDefined();
    expect(document.querySelector('video')).not.toBeNull();

    // Unmount modal
    unmount();

    // Verify pause and load were called to discard memory
    expect(pauseSpy).toHaveBeenCalled();
    expect(loadSpy).toHaveBeenCalled();

    pauseSpy.mockRestore();
    loadSpy.mockRestore();
  });

  it('automatically falls back to embed player when native video errors', async () => {
    const mockGetStream = vi.fn().mockResolvedValue({
      title: 'Rick Astley',
      resolution: '720p',
      duration: 213,
      video_url: 'https://googlevideo.com/video.mp4',
    });

    (window as any).api = {
      youtube: { getStream: mockGetStream },
    };

    render(
      <YouTubeWatchModal
        url={sampleUrl}
        title="Rick Astley"
        onClose={mockOnClose}
      />
    );

    expect(await screen.findByText('Rick Astley')).toBeDefined();
    const video = document.querySelector('video');
    expect(video).not.toBeNull();

    // Trigger error event on video
    fireEvent.error(video!);

    // Should automatically switch to embed iframe
    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toContain('dQw4w9WgXcQ');
    expect(document.querySelector('video')).toBeNull();
  });

  it('respects saved embed player preference from localStorage', async () => {
    localStorage.setItem('caderno_preferred_youtube_player', 'embed');

    render(
      <YouTubeWatchModal
        url={sampleUrl}
        title="Rick Astley"
        onClose={mockOnClose}
      />
    );

    // Should immediately render embed iframe without native yt-dlp delay
    const iframe = document.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toContain('dQw4w9WgXcQ');
    expect(document.querySelector('video')).toBeNull();

    localStorage.removeItem('caderno_preferred_youtube_player');
  });
});

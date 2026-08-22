import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import YouTubeDownloadModal from './YouTubeDownloadModal';

vi.mock('../ui/Portal', () => ({
  Portal: ({ children }: any) => <div data-testid="yt-portal">{children}</div>,
}));

vi.mock('../../store/TaskContext', () => ({
  useTasks: vi.fn(() => ({
    addTask: vi.fn(),
    updateTaskProgress: vi.fn(),
    completeTask: vi.fn(),
    failTask: vi.fn(),
  })),
}));

vi.mock('../../services/video-manager', () => ({
  downloadYouTubeAndSync: vi.fn(),
}));

describe('YouTubeDownloadModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      youtube: {
        fetchInfo: vi.fn().mockResolvedValue({
          title: 'Advanced React Patterns',
          thumbnail: 'https://example.com/thumb.jpg',
          duration: 1800,
          subtitles: {
            en: [{ name: 'English' }],
          },
        }),
      },
    };
  });

  it('fetches video info and displays download options', async () => {
    const { getByPlaceholderText, getByRole, getByDisplayValue } = render(
      <YouTubeDownloadModal onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    const input = getByPlaceholderText('https://www.youtube.com/watch?v=...');
    fireEvent.change(input, { target: { value: 'https://youtube.com/watch?v=abc1234' } });

    const fetchBtn = getByRole('button', { name: /^Analisar$/i });
    fireEvent.click(fetchBtn);

    await waitFor(() => {
      expect(window.api.youtube.fetchInfo).toHaveBeenCalledWith('https://youtube.com/watch?v=abc1234');
      expect(getByDisplayValue('Advanced React Patterns.mp4')).toBeDefined();
    });
  });
});

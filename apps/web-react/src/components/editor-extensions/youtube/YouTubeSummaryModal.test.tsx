import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import YouTubeSummaryModal from './YouTubeSummaryModal';
import * as youtubeSummaryService from '../../../services/youtube/youtubeSummaryService';

vi.mock('../../../services/youtube/youtubeSummaryService', () => ({
  generateYouTubeSummary: vi.fn(),
  getExistingVideoSummary: vi.fn(),
  extractYouTubeVideoId: vi.fn().mockReturnValue('test_vid_123'),
}));

describe('YouTubeSummaryModal', () => {
  const mockOnClose = vi.fn();
  const sampleUrl = 'https://www.youtube.com/watch?v=test_vid_123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and then shows generated summary', async () => {
    vi.mocked(youtubeSummaryService.getExistingVideoSummary).mockResolvedValue(null);
    vi.mocked(youtubeSummaryService.generateYouTubeSummary).mockResolvedValue({
      summary: '## 🎯 Visão Geral [00:00]\n\nEste é o resumo da aula de React.',
      record: {
        id: 'test_vid_123',
        video_id: 'test_vid_123',
        summary: '## 🎯 Visão Geral [00:00]\n\nEste é o resumo da aula de React.',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      transcriptResult: {
        video_id: 'test_vid_123',
        title: 'Aula de React',
        channel: 'Canal Dev',
        language: 'pt',
        transcript: '[00:00] Início',
      },
      fromCache: false,
    });

    render(
      <YouTubeSummaryModal
        url={sampleUrl}
        title="Aula de React"
        channel="Canal Dev"
        onClose={mockOnClose}
      />
    );

    // Initial loading status
    expect(screen.getByText(/Buscando legendas do vídeo|Extraindo transcrição/i)).toBeDefined();

    // Summary should be rendered after resolving
    expect(await screen.findByText(/Visão Geral/i)).toBeDefined();
    expect(screen.getByText('Este é o resumo da aula de React.')).toBeDefined();
    expect(screen.getByText('Copiar Resumo')).toBeDefined();
    expect(screen.getByText('Regenerar')).toBeDefined();
  });

  it('renders cached summary immediately with 0ms perceived latency', async () => {
    vi.mocked(youtubeSummaryService.getExistingVideoSummary).mockResolvedValue({
      id: 'test_vid_123',
      video_id: 'test_vid_123',
      summary: '## Resumo em Cache Instantâneo',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    });

    render(
      <YouTubeSummaryModal
        url={sampleUrl}
        title="Aula de React"
        channel="Canal Dev"
        onClose={mockOnClose}
      />
    );

    expect(await screen.findByText('Resumo em Cache Instantâneo')).toBeDefined();
    expect(youtubeSummaryService.generateYouTubeSummary).not.toHaveBeenCalled();
  });

  it('closes modal when Escape key is pressed', async () => {
    vi.mocked(youtubeSummaryService.getExistingVideoSummary).mockResolvedValue({
      id: 'test_vid_123',
      video_id: 'test_vid_123',
      summary: 'Resumo Completo',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    });

    render(
      <YouTubeSummaryModal
        url={sampleUrl}
        title="Aula de React"
        channel="Canal Dev"
        onClose={mockOnClose}
      />
    );

    expect(await screen.findByText('Resumo Completo')).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays error message when generation fails', async () => {
    vi.mocked(youtubeSummaryService.getExistingVideoSummary).mockResolvedValue(null);
    vi.mocked(youtubeSummaryService.generateYouTubeSummary).mockRejectedValue(
      new Error('Este vídeo não possui legendas disponíveis.')
    );

    render(
      <YouTubeSummaryModal
        url={sampleUrl}
        title="Aula de React"
        channel="Canal Dev"
        onClose={mockOnClose}
      />
    );

    expect(await screen.findByText('Não foi possível gerar o resumo')).toBeDefined();
    expect(screen.getByText('Este vídeo não possui legendas disponíveis.')).toBeDefined();
    expect(screen.getByText('Tentar Novamente')).toBeDefined();
  });

  it('toggles dark mode when clicking the theme button', async () => {
    vi.mocked(youtubeSummaryService.getExistingVideoSummary).mockResolvedValue({
      id: 'test_vid_123',
      video_id: 'test_vid_123',
      summary: '```typescript\nconst x = 42;\n```',
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    });

    const { container } = render(
      <YouTubeSummaryModal
        url={sampleUrl}
        title="Aula de React"
        channel="Canal Dev"
        onClose={mockOnClose}
      />
    );

    // Initial state: default Caderno background bg-dark-bg
    const rootDiv = container.querySelector('.animate-fade-in') || document.querySelector('.animate-fade-in');
    expect(rootDiv).toBeDefined();

    // Dark mode toggle button
    const themeBtn = screen.getByTitle(/Modo Escuro \/ Noturno|Modo Normal/i);
    expect(themeBtn).toBeDefined();

    // Click toggle button
    fireEvent.click(themeBtn);
    expect(localStorage.getItem('caderno_summary_dark_mode')).toBe('true');

    // Click again to return to default
    fireEvent.click(themeBtn);
    expect(localStorage.getItem('caderno_summary_dark_mode')).toBe('false');
  });
});

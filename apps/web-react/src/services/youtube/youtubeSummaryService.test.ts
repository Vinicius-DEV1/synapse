import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractYouTubeVideoId,
  buildYouTubeSummaryPrompt,
  getExistingVideoSummary,
  generateYouTubeSummary,
  YOUTUBE_SUMMARY_SYSTEM_INSTRUCTION,
} from './youtubeSummaryService';

// Mock promptGemini
vi.mock('../gemini', () => ({
  promptGemini: vi.fn(),
}));

import { promptGemini } from '../gemini';

describe('youtubeSummaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.api = {
      youtube: {
        getSummary: vi.fn(),
        saveSummary: vi.fn(),
        fetchTranscript: vi.fn(),
      },
    } as any;
  });

  describe('extractYouTubeVideoId', () => {
    it('extracts ID from standard watch URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from youtu.be short URL', () => {
      expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?si=123')).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from embed URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from shorts URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('returns null on invalid string', () => {
      expect(extractYouTubeVideoId('')).toBeNull();
      expect(extractYouTubeVideoId('https://example.com/other')).toBeNull();
    });
  });

  describe('buildYouTubeSummaryPrompt', () => {
    it('includes title, channel, timestamps and noise removal instructions', () => {
      const prompt = buildYouTubeSummaryPrompt(
        'Curso de React - Aula 01',
        'Lucas Dev',
        '[00:00] Início da aula\n[01:30] O que é o React',
        15
      );

      expect(prompt).toContain('Curso de React - Aula 01');
      expect(prompt).toContain('Lucas Dev');
      expect(prompt).toContain('[00:00] Início da aula');
      expect(prompt).toContain('CITE AS MINUTAGENS [mm:ss]');
      expect(prompt).toContain('Elimine 100% de jabás');
    });

    it('verifies system instruction enforces didactic layout and timestamps', () => {
      expect(YOUTUBE_SUMMARY_SYSTEM_INSTRUCTION).toContain('CITAÇÃO OBRIGATÓRIA DE MINUTAGENS');
      expect(YOUTUBE_SUMMARY_SYSTEM_INSTRUCTION).toContain('FILTRO ESTRITO DE RUÍDO E PROPAGANDA');
      expect(YOUTUBE_SUMMARY_SYSTEM_INSTRUCTION).toContain('## 🎯 Visão Geral & Objetivo');
    });
  });

  describe('getExistingVideoSummary', () => {
    it('returns null if summary does not exist in DB', async () => {
      (window.api.youtube.getSummary as any).mockResolvedValue(null);
      const res = await getExistingVideoSummary('test_vid_123');
      expect(res).toBeNull();
      expect(window.api.youtube.getSummary).toHaveBeenCalledWith('test_vid_123');
    });

    it('returns summary record from database', async () => {
      const mockRecord = {
        id: 'test_vid_123',
        video_id: 'test_vid_123',
        title: 'React Hooks',
        channel_name: 'Tech Channel',
        summary: 'Resumo completo...',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      (window.api.youtube.getSummary as any).mockResolvedValue(mockRecord);

      const res = await getExistingVideoSummary('test_vid_123');
      expect(res).toEqual(mockRecord);
    });
  });

  describe('generateYouTubeSummary', () => {
    it('returns cached summary immediately if already exists in DB', async () => {
      const mockRecord = {
        id: 'vid_abc',
        video_id: 'vid_abc',
        title: 'TypeScript Tutorial',
        channel_name: 'Code Pro',
        summary: '## Resumo em cache...',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      };
      (window.api.youtube.getSummary as any).mockResolvedValue(mockRecord);

      const result = await generateYouTubeSummary({
        url: 'https://youtube.com/watch?v=vid_abc',
      });

      expect(result.fromCache).toBe(true);
      expect(result.summary).toBe('## Resumo em cache...');
      expect(window.api.youtube.fetchTranscript).not.toHaveBeenCalled();
      expect(promptGemini).not.toHaveBeenCalled();
    });

    it('fetches transcript, prompts Gemini, and saves to DB when not in cache', async () => {
      (window.api.youtube.getSummary as any).mockResolvedValue(null);
      (window.api.youtube.fetchTranscript as any).mockResolvedValue({
        video_id: 'vid_new',
        title: 'Clean Architecture',
        channel: 'Uncle Bob',
        duration: 600,
        language: 'pt-BR',
        transcript: '[00:00] Arquitetura de software\n[05:00] Princípios SOLID',
      });
      (promptGemini as any).mockResolvedValue({
        text: '## 🎯 Resumo Didático\n\n- [00:00] Arquitetura...',
      });

      const result = await generateYouTubeSummary({
        url: 'https://youtube.com/watch?v=vid_new',
        title: 'Clean Architecture',
        channel: 'Uncle Bob',
      });

      expect(result.fromCache).toBe(false);
      expect(result.summary).toContain('## 🎯 Resumo Didático');
      expect(window.api.youtube.fetchTranscript).toHaveBeenCalledWith('https://youtube.com/watch?v=vid_new');
      expect(promptGemini).toHaveBeenCalled();
      expect(window.api.youtube.saveSummary).toHaveBeenCalledWith(
        'vid_new',
        'Clean Architecture',
        'Uncle Bob',
        '## 🎯 Resumo Didático\n\n- [00:00] Arquitetura...',
        '[00:00] Arquitetura de software\n[05:00] Princípios SOLID'
      );
    });

    it('forces regeneration when forceRegenerate is true even if cached in DB', async () => {
      (window.api.youtube.getSummary as any).mockResolvedValue({
        id: 'vid_new2',
        video_id: 'vid_new2',
        summary: 'Resumo antigo...',
      });
      (window.api.youtube.fetchTranscript as any).mockResolvedValue({
        video_id: 'vid_new2',
        title: 'Video',
        channel: 'Canal',
        transcript: '[00:00] Conteúdo novo',
      });
      (promptGemini as any).mockResolvedValue({
        text: '## Resumo Atualizado',
      });

      const result = await generateYouTubeSummary({
        url: 'https://youtube.com/watch?v=vid_new2',
        forceRegenerate: true,
      });

      expect(result.fromCache).toBe(false);
      expect(result.summary).toBe('## Resumo Atualizado');
      expect(promptGemini).toHaveBeenCalled();
    });

    it('executes two-pass multimodal pipeline when extractFrames and getStream are available', async () => {
      (window.api.youtube.getSummary as any).mockResolvedValue(null);
      (window.api.youtube.fetchTranscript as any).mockResolvedValue({
        video_id: 'vid_multi',
        title: 'React Hooks Completo',
        channel: 'Rocketseat',
        transcript: '[00:00] Fala devs\n[02:15] useReducer na prática\n[05:40] useCallback',
        duration: 600,
      });

      window.api.youtube.getStream = vi.fn().mockResolvedValue({
        video_url: 'https://googlevideo.com/stream720.mp4',
        resolution: '1280x720',
        duration: 600,
      });

      window.api.youtube.extractFrames = vi.fn().mockResolvedValue([
        { timestamp: '02:15', seconds: 135, data_url: 'data:image/jpeg;base64,frame1' },
        { timestamp: '05:40', seconds: 340, data_url: 'data:image/jpeg;base64,frame2' },
      ]);

      (promptGemini as any)
        .mockResolvedValueOnce({
          text: JSON.stringify({
            has_visual_content: true,
            timestamps: [
              { timestamp: '02:15', seconds: 135, reason: 'código useReducer' },
              { timestamp: '05:40', seconds: 340, reason: 'código useCallback' },
            ],
          }),
        })
        .mockResolvedValueOnce({
          text: '## 🎯 Resumo Multimodal com Visão Computacional\n\n```typescript\nconst [state, dispatch] = useReducer(reducer, initial);\n```',
        });

      const onProgress = vi.fn();
      const result = await generateYouTubeSummary({
        url: 'https://youtube.com/watch?v=vid_multi',
        onProgress,
      });

      expect(result.fromCache).toBe(false);
      expect(result.framesAnalyzed).toBe(2);
      expect(result.summary).toContain('Resumo Multimodal');
      expect(window.api.youtube.getStream).toHaveBeenCalledWith('https://youtube.com/watch?v=vid_multi');
      expect(window.api.youtube.extractFrames).toHaveBeenCalledWith(
        'https://googlevideo.com/stream720.mp4',
        [135, 340]
      );
      expect(promptGemini).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('Passo 1/2'));
      expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('Passo 2/2'));
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVideoVocabulary } from './useVideoVocabulary';
import type { VideoItem } from '../../../types';

describe('useVideoVocabulary Hook', () => {
  const mockVideo: VideoItem = {
    id: 'vid_voc_1',
    title: 'TED Talk: Body Language',
    drive_id: 'drive_123',
    created_at: 1000,
    updated_at: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      sync: {
        getTable: vi.fn().mockResolvedValue([
          { id: 'w1', video_id: 'vid_voc_1', word: 'posture', timestamp: 12 },
          { id: 'w2', video_id: 'vid_other', word: 'other', timestamp: 50 },
        ]),
      },
    };
  });

  it('loads video words associated with the video from sync table', async () => {
    const cues = [{ startTime: 10, endTime: 15, text: 'Keep your posture upright' }];

    const { result } = renderHook(() =>
      useVideoVocabulary(mockVideo, cues, 'Keep your posture upright')
    );

    await waitFor(() => {
      expect(result.current.videoWords).toHaveLength(1);
      expect(result.current.videoWords[0].word).toBe('posture');
    });

    expect(result.current.activeSavedWords).toHaveLength(1);
  });
});

import { describe, it, expect } from 'vitest';
import {
  formatVideoTime,
  buildVideoSubtitleContext,
  calculateVideoClip,
} from './videoContextHelper';
import type { SubtitleCue } from '../../../utils/vtt-parser';

describe('videoContextHelper', () => {
  describe('formatVideoTime', () => {
    it('formats seconds into MM:SS and HH:MM:SS', () => {
      expect(formatVideoTime(0)).toBe('00:00');
      expect(formatVideoTime(65)).toBe('01:05');
      expect(formatVideoTime(3665)).toBe('1:01:05');
    });
  });

  describe('buildVideoSubtitleContext', () => {
    const sampleCues: SubtitleCue[] = [
      { startTime: 1.0, endTime: 3.0, text: 'Hello everyone.' },
      { startTime: 3.5, endTime: 6.0, text: 'Welcome to this lesson.' },
      { startTime: 6.5, endTime: 9.0, text: 'Let us begin.' },
    ];

    it('returns fallback context when index is -1', () => {
      expect(buildVideoSubtitleContext(sampleCues, -1, 'Lesson 1', 'Default fallback')).toBe('Default fallback');
    });

    it('builds rich context with metadata, target cue and surrounding cues', () => {
      const context = buildVideoSubtitleContext(sampleCues, 1, 'Lesson 1', 'fallback');
      expect(context).toContain('Título: "Lesson 1"');
      expect(context).toContain('Welcome to this lesson.');
      expect(context).toContain('Hello everyone.');
      expect(context).toContain('Let us begin.');
    });
  });

  describe('calculateVideoClip', () => {
    it('calculates video clip timestamps with padding buffer', () => {
      const cues: SubtitleCue[] = [
        { startTime: 10.0, endTime: 15.0, text: 'Target sentence' },
      ];

      const clip = calculateVideoClip(cues, 0, '/videos/lesson.mp4');
      expect(clip).toEqual({
        path: '/videos/lesson.mp4',
        startMs: 9500, // 10.0 - 0.5 = 9.5s
        endMs: 15500,  // 15.0 + 0.5 = 15.5s
      });
    });

    it('returns undefined when index is -1', () => {
      expect(calculateVideoClip([], -1, '/videos/lesson.mp4')).toBeUndefined();
    });
  });
});

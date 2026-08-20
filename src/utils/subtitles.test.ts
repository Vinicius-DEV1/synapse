import { describe, it, expect } from 'vitest';
import { srtToVtt, processSubtitleFile } from './subtitles';

describe('subtitles utils', () => {
  it('converts SRT format to WebVTT format', () => {
    const srt = `1
00:00:01,500 --> 00:00:04,200
Hello World

2
00:00:05,000 --> 00:00:08,000
Second line`;

    const vtt = srtToVtt(srt);
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    expect(vtt).toContain('00:00:01.500 --> 00:00:04.200');
    expect(vtt).toContain('00:00:05.000 --> 00:00:08.000');
  });

  it('processes .srt File objects into VTT', async () => {
    const srtContent = '1\n00:00:01,000 --> 00:00:02,000\nTest';
    const srtFile = new File([srtContent], 'sub.srt', { type: 'text/plain' });

    const result = await processSubtitleFile(srtFile);
    expect(result.startsWith('WEBVTT')).toBe(true);
    expect(result).toContain('00:00:01.000 --> 00:00:02.000');
  });

  it('leaves .vtt files unchanged', async () => {
    const vttContent = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nAlready VTT';
    const vttFile = new File([vttContent], 'sub.vtt', { type: 'text/vtt' });

    const result = await processSubtitleFile(vttFile);
    expect(result).toBe(vttContent);
  });
});

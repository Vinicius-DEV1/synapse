import { describe, it, expect } from 'vitest';
import { parseVtt } from './vtt-parser';

describe('vtt-parser', () => {
  it('parses standard WebVTT cues with start and end times', () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
Hello World!

00:00:05.500 --> 00:00:08.250
This is Caderno subtitle test.`;

    const cues = parseVtt(vtt);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({
      startTime: 1,
      endTime: 4,
      text: 'Hello World!',
    });
    expect(cues[1]).toEqual({
      startTime: 5.5,
      endTime: 8.25,
      text: 'This is Caderno subtitle test.',
    });
  });

  it('handles HH:MM:SS format and SRT-style commas', () => {
    const vtt = `WEBVTT

01:15:30,200 --> 01:15:35,800
Long movie scene`;

    const cues = parseVtt(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0].startTime).toBe(1 * 3600 + 15 * 60 + 30.2);
    expect(cues[0].endTime).toBe(1 * 3600 + 15 * 60 + 35.8);
    expect(cues[0].text).toBe('Long movie scene');
  });

  it('cleans HTML tags and decodes HTML entities from cue text', () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
<c.colorGold><b>Tom &amp; Jerry</b></c> &quot;Adventures&quot;`;

    const cues = parseVtt(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe('Tom & Jerry "Adventures"');
  });

  it('joins multiline cue text into a single line', () => {
    const vtt = `WEBVTT

00:00:02.000 --> 00:00:05.000
First line of speech
Second line of speech`;

    const cues = parseVtt(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe('First line of speech Second line of speech');
  });
});

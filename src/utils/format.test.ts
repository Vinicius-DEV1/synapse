import { describe, it, expect } from 'vitest';
import { formatBytes, formatDuration, formatHumanDuration } from './format';

describe('formatBytes utility', () => {

  it('formats 0 bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes, KB, MB, GB correctly', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1048576)).toBe('1 MB');
    expect(formatBytes(1073741824)).toBe('1 GB');
  });
});

describe('formatDuration utility', () => {
  it('handles empty / invalid inputs with fallback', () => {
    expect(formatDuration(undefined, '0:00')).toBe('0:00');
    expect(formatDuration(0, '--:--')).toBe('--:--');
    expect(formatDuration(undefined)).toBe('');
  });

  it('formats minutes and seconds correctly', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(300)).toBe('5:00');
  });

  it('formats hours, minutes and seconds correctly', () => {
    expect(formatDuration(3665)).toBe('1:01:05');
    expect(formatDuration(7200)).toBe('2:00:00');
  });
});

describe('formatHumanDuration utility', () => {
  it('formats human readable duration without seconds', () => {
    expect(formatHumanDuration(3660)).toBe('1h 1m');
    expect(formatHumanDuration(120)).toBe('2m');
    expect(formatHumanDuration(0, { fallback: '0m' })).toBe('0m');
  });

  it('formats human readable duration with seconds', () => {
    expect(formatHumanDuration(3665, { includeSeconds: true })).toBe('1h 01m 05s');
    expect(formatHumanDuration(65, { includeSeconds: true })).toBe('1m 05s');
  });
});


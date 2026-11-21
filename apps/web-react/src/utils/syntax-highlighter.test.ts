import { describe, it, expect } from 'vitest';
import {
  highlightCodeAsync,
  highlightCodeSyncIfLoaded,
  normalizeCodeLanguage,
  SUPPORTED_CODE_LANGUAGES,
} from './syntax-highlighter';

describe('syntax-highlighter on-demand loader', () => {
  it('normalizes aliases and rejects unknown or auto language names', () => {
    expect(normalizeCodeLanguage('ts')).toBe('typescript');
    expect(normalizeCodeLanguage('JS')).toBe('javascript');
    expect(normalizeCodeLanguage('py')).toBe('python');
    expect(normalizeCodeLanguage('html')).toBe('xml');
    expect(normalizeCodeLanguage('auto')).toBeNull();
    expect(normalizeCodeLanguage('nonexistent-lang')).toBeNull();
    expect(normalizeCodeLanguage('')).toBeNull();
    expect(SUPPORTED_CODE_LANGUAGES).toContain('typescript');
    expect(SUPPORTED_CODE_LANGUAGES).toContain('rust');
  });

  it('loads grammar on demand, highlights asynchronously, and hits sync fast-path afterwards', async () => {
    const html = await highlightCodeAsync('const x = 42;', 'ts');
    expect(html).not.toBeNull();
    expect(html).toContain('hljs-keyword');

    const syncHtml = highlightCodeSyncIfLoaded('let y = 99;', 'typescript');
    expect(syncHtml).not.toBeNull();
    expect(syncHtml).toContain('hljs-keyword');
  });

  it('returns null instead of calling highlightAuto for unknown languages', async () => {
    const html = await highlightCodeAsync('some arbitrary text', 'unknown_xyz');
    expect(html).toBeNull();
  });
});

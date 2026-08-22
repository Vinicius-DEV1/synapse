import { describe, it, expect } from 'vitest';
import { escapeRegex, stripHtml, getCachedPlainText } from './search-utils';

describe('search-utils', () => {
  it('escapes regex characters correctly', () => {
    expect(escapeRegex('hello.world*?')).toBe('hello\\.world\\*\\?');
  });

  it('strips HTML tags and normalizes spaces', () => {
    expect(stripHtml('<p>Hello <b>World</b>&nbsp;!</p>')).toBe('Hello World !');
  });

  it('caches stripped plain text efficiently', () => {
    const raw = '<p>Test cache</p>';
    const res1 = getCachedPlainText('page1', raw);
    const res2 = getCachedPlainText('page1', raw);
    expect(res1).toBe('Test cache');
    expect(res2).toBe('Test cache');
  });
});

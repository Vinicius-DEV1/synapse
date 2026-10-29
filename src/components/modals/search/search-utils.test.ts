import { describe, it, expect } from 'vitest';
import {
  escapeRegex,
  stripHtml,
  getCachedPlainText,
  clearPlainTextCache,
  getPlainTextCacheSize,
} from './search-utils';

describe('search-utils', () => {
  it('escapes regex characters correctly', () => {
    expect(escapeRegex('hello.world*?')).toBe('hello\\.world\\*\\?');
  });

  it('strips HTML tags and normalizes spaces', () => {
    expect(stripHtml('<p>Hello <b>World</b>&nbsp;!</p>')).toBe('Hello World !');
  });

  it('caches stripped plain text efficiently', () => {
    clearPlainTextCache();
    const raw = '<p>Test cache</p>';
    const res1 = getCachedPlainText('page1', raw);
    const res2 = getCachedPlainText('page1', raw);
    expect(res1).toBe('Test cache');
    expect(res2).toBe('Test cache');
    expect(getPlainTextCacheSize()).toBe(1);
  });

  it('invalidates and clears plain text cache accurately', () => {
    clearPlainTextCache();
    getCachedPlainText('page1', '<p>Alpha</p>');
    getCachedPlainText('page2', '<p>Beta</p>');
    expect(getPlainTextCacheSize()).toBe(2);

    clearPlainTextCache();
    expect(getPlainTextCacheSize()).toBe(0);

    const fresh = getCachedPlainText('page1', '<p>Alpha updated</p>');
    expect(fresh).toBe('Alpha updated');
    expect(getPlainTextCacheSize()).toBe(1);
  });
});

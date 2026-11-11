import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getReadingProgress,
  saveReadingProgress,
  addBookmark,
  removeBookmark,
  updateBookmarkLabel,
} from './reading-progress';

describe('reading-progress', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and gets reading progress correctly', () => {
    const fileId = 'book_123';
    saveReadingProgress(fileId, {
      scrollTop: 500,
      percentage: 42.6,
      scrollHeight: 1200,
    });

    const progress = getReadingProgress(fileId);
    expect(progress).not.toBeNull();
    expect(progress?.scrollTop).toBe(500);
    expect(progress?.percentage).toBe(43); // rounded
    expect(progress?.scrollHeight).toBe(1200);
    expect(progress?.bookmarks).toEqual([]);
  });

  it('clamps percentage between 0 and 100', () => {
    saveReadingProgress('book_over', { scrollTop: 2000, percentage: 150, scrollHeight: 1000 });
    expect(getReadingProgress('book_over')?.percentage).toBe(100);

    saveReadingProgress('book_under', { scrollTop: 0, percentage: -20, scrollHeight: 1000 });
    expect(getReadingProgress('book_under')?.percentage).toBe(0);
  });

  it('adds, updates and removes bookmarks', () => {
    const fileId = 'book_456';
    let time = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => ++time);

    const bm1 = addBookmark(fileId, 'Capítulo 1', 150);
    expect(bm1).not.toBeNull();
    expect(bm1?.label).toBe('Capítulo 1');
    expect(bm1?.scrollTop).toBe(150);

    const bm2 = addBookmark(fileId, '', 300);
    expect(bm2?.label).toBe('Marcador em 300px');

    let current = getReadingProgress(fileId);
    expect(current?.bookmarks).toHaveLength(2);

    if (bm1) {
      updateBookmarkLabel(fileId, bm1.id, 'Capítulo 1 Revisado');
      current = getReadingProgress(fileId);
      expect(current?.bookmarks[0].label).toBe('Capítulo 1 Revisado');

      removeBookmark(fileId, bm1.id);
      current = getReadingProgress(fileId);
      expect(current?.bookmarks).toHaveLength(1);
      expect(current?.bookmarks[0].id).toBe(bm2?.id);
    }

    vi.restoreAllMocks();
  });
});

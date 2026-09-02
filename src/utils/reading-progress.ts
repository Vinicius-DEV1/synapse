export interface Bookmark {
  id: string;
  label: string;
  scrollTop: number;
  createdAt: string;
}

export interface ReadingProgressData {
  scrollTop: number;
  percentage: number;
  scrollHeight: number;
  updatedAt: string;
  bookmarks: Bookmark[];
}

const STORAGE_PREFIX = 'caderno_reading_progress_';

export function getReadingProgress(fileId: string): ReadingProgressData | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${fileId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ReadingProgressData;
  } catch (e) {
    console.error('Error loading reading progress', e);
    return null;
  }
}

export function saveReadingProgress(
  fileId: string,
  data: { scrollTop: number; percentage: number; scrollHeight: number }
): void {
  try {
    const existing = getReadingProgress(fileId);
    const updated: ReadingProgressData = {
      scrollTop: data.scrollTop,
      percentage: Math.min(100, Math.max(0, Math.round(data.percentage))),
      scrollHeight: data.scrollHeight,
      updatedAt: new Date().toISOString(),
      bookmarks: existing?.bookmarks ? [...existing.bookmarks] : []
    };
    localStorage.setItem(`${STORAGE_PREFIX}${fileId}`, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving reading progress', e);
  }
}

export function addBookmark(fileId: string, label: string, scrollTop: number): Bookmark | null {
  try {
    const existing = getReadingProgress(fileId) || {
      scrollTop: 0,
      percentage: 0,
      scrollHeight: 0,
      updatedAt: new Date().toISOString(),
      bookmarks: []
    };

    const newBookmark: Bookmark = {
      id: `bm_${Date.now()}`,
      label: label.trim() || `Marcador em ${Math.round(scrollTop)}px`,
      scrollTop: Math.round(scrollTop),
      createdAt: new Date().toISOString()
    };

    const updated: ReadingProgressData = {
      ...existing,
      updatedAt: new Date().toISOString(),
      bookmarks: [...existing.bookmarks, newBookmark]
    };

    localStorage.setItem(`${STORAGE_PREFIX}${fileId}`, JSON.stringify(updated));
    return newBookmark;
  } catch (e) {
    console.error('Error adding bookmark', e);
    return null;
  }
}

export function removeBookmark(fileId: string, bookmarkId: string): void {
  try {
    const existing = getReadingProgress(fileId);
    if (!existing) return;

    const updated: ReadingProgressData = {
      ...existing,
      updatedAt: new Date().toISOString(),
      bookmarks: existing.bookmarks.filter(b => b.id !== bookmarkId)
    };

    localStorage.setItem(`${STORAGE_PREFIX}${fileId}`, JSON.stringify(updated));
  } catch (e) {
    console.error('Error removing bookmark', e);
  }
}

export function updateBookmarkLabel(fileId: string, bookmarkId: string, newLabel: string): void {
  try {
    const existing = getReadingProgress(fileId);
    if (!existing) return;

    const trimmed = newLabel.trim();
    const updated: ReadingProgressData = {
      ...existing,
      updatedAt: new Date().toISOString(),
      bookmarks: existing.bookmarks.map(b => (b.id === bookmarkId ? { ...b, label: trimmed || b.label } : b))
    };

    localStorage.setItem(`${STORAGE_PREFIX}${fileId}`, JSON.stringify(updated));
  } catch (e) {
    console.error('Error updating bookmark label', e);
  }
}

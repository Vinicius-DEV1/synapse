import type { Page } from '../types/notes';
import type { LibraryBook, LibraryHighlight, LibraryBookmark } from '../types/library';

const STORAGE_KEYS = {
  pages: 'caderno_mobile_pages',
  books: 'caderno_mobile_books',
  highlights: 'caderno_mobile_highlights',
  bookmarks: 'caderno_mobile_bookmarks',
};

export const initDb = async () => {};
export const getDb = async () => ({});

// --- PAGES ---
export async function getAllPages(): Promise<Page[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.pages);
    const list: Page[] = raw ? JSON.parse(raw) : [];
    return list.filter((p) => !p.deleted_at);
  } catch {
    return [];
  }
}

export async function upsertPage(page: Partial<Page> & { id: string }): Promise<void> {
  const pages = await getAllPages();
  const index = pages.findIndex((p) => p.id === page.id);
  const now = new Date().toISOString();

  if (index >= 0) {
    pages[index] = { ...pages[index], ...page, updated_at: now };
  } else {
    pages.unshift({
      id: page.id,
      parent_id: page.parent_id ?? null,
      title: page.title ?? 'Nova Página',
      icon: page.icon ?? '📄',
      content: page.content ?? '',
      crdt_state: page.crdt_state ?? null,
      sort_order: page.sort_order ?? 0,
      is_locked: page.is_locked ?? 0,
      is_pinned: page.is_pinned ?? 0,
      pinned_order: page.pinned_order ?? 0,
      cover_image: page.cover_image ?? null,
      description: page.description ?? null,
      created_at: page.created_at ?? now,
      updated_at: page.updated_at ?? now,
      deleted_at: page.deleted_at ?? null,
    });
  }

  localStorage.setItem(STORAGE_KEYS.pages, JSON.stringify(pages));
}

export async function deletePageLocal(id: string): Promise<void> {
  const pages = await getAllPages();
  const filtered = pages.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.pages, JSON.stringify(filtered));
}

// --- BOOKS ---
export async function getAllBooks(): Promise<LibraryBook[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.books);
    const list: LibraryBook[] = raw ? JSON.parse(raw) : [];
    return list.filter((b) => !b.deleted_at);
  } catch {
    return [];
  }
}

export async function upsertBook(book: Partial<LibraryBook> & { id: string }): Promise<void> {
  const books = await getAllBooks();
  const index = books.findIndex((b) => b.id === book.id);
  const now = new Date().toISOString();

  if (index >= 0) {
    books[index] = { ...books[index], ...book, updated_at: now };
  } else {
    books.unshift({
      id: book.id,
      title: book.title ?? 'Sem Título',
      author: book.author ?? 'Desconhecido',
      cover_image: book.cover_image ?? '',
      file_path: book.file_path ?? '',
      original_name: book.original_name ?? '',
      drive_file_id: book.drive_file_id ?? null,
      total_pages: book.total_pages ?? 0,
      last_read_page: book.last_read_page ?? 1,
      reading_status: book.reading_status ?? 'not_started',
      reading_preferences: book.reading_preferences ?? null,
      created_at: book.created_at ?? now,
      updated_at: book.updated_at ?? now,
      last_read_at: book.last_read_at ?? null,
      deleted_at: book.deleted_at ?? null,
    });
  }

  localStorage.setItem(STORAGE_KEYS.books, JSON.stringify(books));
}

export async function deleteBookLocal(id: string): Promise<void> {
  const books = await getAllBooks();
  const filtered = books.filter((b) => b.id !== id);
  localStorage.setItem(STORAGE_KEYS.books, JSON.stringify(filtered));
}

// --- HIGHLIGHTS & BOOKMARKS ---
export async function getHighlights(bookId: string): Promise<LibraryHighlight[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.highlights);
    const map: Record<string, LibraryHighlight[]> = raw ? JSON.parse(raw) : {};
    return map[bookId] || [];
  } catch {
    return [];
  }
}

export async function upsertHighlight(hl: LibraryHighlight): Promise<void> {
  const raw = localStorage.getItem(STORAGE_KEYS.highlights);
  const map: Record<string, LibraryHighlight[]> = raw ? JSON.parse(raw) : {};
  const list = map[hl.book_id] || [];
  const idx = list.findIndex((h) => h.id === hl.id);
  if (idx >= 0) list[idx] = hl;
  else list.push(hl);
  map[hl.book_id] = list;
  localStorage.setItem(STORAGE_KEYS.highlights, JSON.stringify(map));
}

export async function getBookmarks(bookId: string): Promise<LibraryBookmark[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.bookmarks);
    const map: Record<string, LibraryBookmark[]> = raw ? JSON.parse(raw) : {};
    return map[bookId] || [];
  } catch {
    return [];
  }
}

export async function upsertBookmark(bm: LibraryBookmark): Promise<void> {
  const raw = localStorage.getItem(STORAGE_KEYS.bookmarks);
  const map: Record<string, LibraryBookmark[]> = raw ? JSON.parse(raw) : {};
  const list = map[bm.book_id] || [];
  const idx = list.findIndex((b) => b.id === bm.id);
  if (idx >= 0) list[idx] = bm;
  else list.push(bm);
  map[bm.book_id] = list;
  localStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(map));
}

export async function deleteBookmark(id: string): Promise<void> {
  const raw = localStorage.getItem(STORAGE_KEYS.bookmarks);
  const map: Record<string, LibraryBookmark[]> = raw ? JSON.parse(raw) : {};
  for (const bookId of Object.keys(map)) {
    map[bookId] = map[bookId].filter((b) => b.id !== id);
  }
  localStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(map));
}

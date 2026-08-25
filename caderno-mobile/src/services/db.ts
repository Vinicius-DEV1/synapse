import * as SQLite from 'expo-sqlite';
import type { Page } from '../types/notes';
import type { LibraryBook, LibraryHighlight, LibraryBookmark } from '../types/library';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const initDb = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('caderno.db');
    await dbInstance.execAsync(`
      CREATE TABLE IF NOT EXISTS pages (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        title TEXT NOT NULL,
        icon TEXT DEFAULT '📄',
        content TEXT,
        crdt_state TEXT,
        sort_order INTEGER DEFAULT 0,
        is_locked INTEGER DEFAULT 0,
        is_pinned INTEGER DEFAULT 0,
        pinned_order INTEGER DEFAULT 0,
        cover_image TEXT,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS page_history (
        id TEXT PRIMARY KEY,
        page_id TEXT NOT NULL,
        content TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS books (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT,
        cover_image TEXT,
        file_path TEXT,
        original_name TEXT,
        drive_file_id TEXT,
        total_pages INTEGER DEFAULT 0,
        last_read_page TEXT DEFAULT '1',
        reading_status TEXT DEFAULT 'not_started',
        reading_preferences TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_read_at TEXT,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS highlights (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        text_content TEXT,
        color TEXT DEFAULT 'yellow',
        rects TEXT,
        highlight_type TEXT DEFAULT 'text',
        note TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        book_id TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        label TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  return dbInstance;
};

export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!dbInstance) return initDb();
  return dbInstance;
};

// --- PAGES HELPERS ---
export async function getAllPages(): Promise<Page[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Page>(
    'SELECT * FROM pages WHERE deleted_at IS NULL ORDER BY sort_order ASC, updated_at DESC'
  );
  return rows;
}

export async function getPageById(id: string): Promise<Page | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Page>(
    'SELECT * FROM pages WHERE id = ? AND deleted_at IS NULL LIMIT 1',
    [id]
  );
  return row ?? null;
}

export async function upsertPage(page: Partial<Page> & { id: string }): Promise<void> {
  const db = await getDb();

  await db.runAsync(
    `INSERT INTO pages (id, parent_id, title, icon, content, crdt_state, sort_order, is_locked, is_pinned, pinned_order, cover_image, description, created_at, updated_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       parent_id = COALESCE(excluded.parent_id, pages.parent_id),
       title = COALESCE(excluded.title, pages.title),
       icon = COALESCE(excluded.icon, pages.icon),
       content = COALESCE(excluded.content, pages.content),
       crdt_state = COALESCE(excluded.crdt_state, pages.crdt_state),
       sort_order = COALESCE(excluded.sort_order, pages.sort_order),
       is_locked = COALESCE(excluded.is_locked, pages.is_locked),
       is_pinned = COALESCE(excluded.is_pinned, pages.is_pinned),
       pinned_order = COALESCE(excluded.pinned_order, pages.pinned_order),
       cover_image = COALESCE(excluded.cover_image, pages.cover_image),
       description = COALESCE(excluded.description, pages.description),
       updated_at = COALESCE(excluded.updated_at, pages.updated_at),
       deleted_at = excluded.deleted_at`,
    [
      page.id,
      page.parent_id ?? null,
      page.title ?? 'Nova Página',
      page.icon ?? '📄',
      page.content ?? '',
      page.crdt_state !== undefined ? page.crdt_state : null,
      page.sort_order ?? 0,
      page.is_locked ?? 0,
      page.is_pinned ?? 0,
      page.pinned_order ?? 0,
      page.cover_image ?? null,
      page.description ?? null,
      page.created_at ?? new Date().toISOString(),
      page.updated_at ?? new Date().toISOString(),
      page.deleted_at ?? null,
    ]
  );
}

export async function deletePageLocal(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE pages SET deleted_at = ? WHERE id = ?', [new Date().toISOString(), id]);
}

// --- BOOKS HELPERS ---
export async function getAllBooks(): Promise<LibraryBook[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM books WHERE deleted_at IS NULL ORDER BY updated_at DESC'
  );
  return rows.map(r => ({
    ...r,
    last_read_page: isNaN(Number(r.last_read_page)) ? r.last_read_page : Number(r.last_read_page)
  }));
}

export async function upsertBook(book: Partial<LibraryBook> & { id: string }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO books (id, title, author, cover_image, file_path, original_name, drive_file_id, total_pages, last_read_page, reading_status, reading_preferences, created_at, updated_at, last_read_at, deleted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = COALESCE(excluded.title, books.title),
       author = COALESCE(excluded.author, books.author),
       cover_image = COALESCE(excluded.cover_image, books.cover_image),
       file_path = COALESCE(excluded.file_path, books.file_path),
       original_name = COALESCE(excluded.original_name, books.original_name),
       drive_file_id = COALESCE(excluded.drive_file_id, books.drive_file_id),
       total_pages = COALESCE(excluded.total_pages, books.total_pages),
       last_read_page = COALESCE(excluded.last_read_page, books.last_read_page),
       reading_status = COALESCE(excluded.reading_status, books.reading_status),
       reading_preferences = COALESCE(excluded.reading_preferences, books.reading_preferences),
       updated_at = COALESCE(excluded.updated_at, books.updated_at),
       last_read_at = COALESCE(excluded.last_read_at, books.last_read_at),
       deleted_at = excluded.deleted_at`,
    [
      book.id,
      book.title ?? 'Sem Título',
      book.author ?? 'Desconhecido',
      book.cover_image ?? '',
      book.file_path ?? '',
      book.original_name ?? '',
      book.drive_file_id ?? null,
      book.total_pages ?? 0,
      String(book.last_read_page ?? '1'),
      book.reading_status ?? 'not_started',
      book.reading_preferences ?? null,
      book.created_at ?? new Date().toISOString(),
      book.updated_at ?? new Date().toISOString(),
      book.last_read_at ?? null,
      book.deleted_at ?? null,
    ]
  );
}

export async function deleteBookLocal(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE books SET deleted_at = ? WHERE id = ?', [new Date().toISOString(), id]);
}

// --- HIGHLIGHTS & BOOKMARKS ---
export async function getHighlights(bookId: string): Promise<LibraryHighlight[]> {
  const db = await getDb();
  return await db.getAllAsync<LibraryHighlight>(
    'SELECT * FROM highlights WHERE book_id = ? ORDER BY page_number ASC',
    [bookId]
  );
}

export async function upsertHighlight(hl: LibraryHighlight): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO highlights (id, book_id, page_number, text_content, color, rects, highlight_type, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       text_content = excluded.text_content,
       color = excluded.color,
       note = excluded.note`,
    [hl.id, hl.book_id, hl.page_number, hl.text_content, hl.color, hl.rects ?? null, hl.highlight_type ?? 'text', hl.note ?? null, hl.created_at]
  );
}

export async function getBookmarks(bookId: string): Promise<LibraryBookmark[]> {
  const db = await getDb();
  return await db.getAllAsync<LibraryBookmark>(
    'SELECT * FROM bookmarks WHERE book_id = ? ORDER BY page_number ASC',
    [bookId]
  );
}

export async function upsertBookmark(bm: LibraryBookmark): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO bookmarks (id, book_id, page_number, label, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET label = excluded.label`,
    [bm.id, bm.book_id, bm.page_number, bm.label, bm.created_at]
  );
}

export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM bookmarks WHERE id = ?', [id]);
}

export type ReadingStatus = 'not_started' | 'reading' | 'finished';
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';
export type HighlightType = 'text' | 'rect';
export type ReadingMode = 'light' | 'sepia' | 'mint' | 'dim' | 'nord' | 'midnight' | 'dark' | 'high-contrast';

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  file_path: string;
  original_name: string;
  cover_image: string;
  total_pages: number;
  last_read_page: number;
  reading_status: ReadingStatus;
  last_read_at: string | null;
  created_at: string;
  updated_at: string;
  drive_file_id?: string | null;
  collections?: LibraryCollection[];
  published_year?: number | null;
  publisher?: string | null;
  language?: string | null;
  epub_locations?: string | null;
}

export interface LibraryCollection {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface LibraryHighlight {
  id: string;
  book_id: string;
  page_number: number;
  text_content: string;
  color: HighlightColor;
  rects: string;
  highlight_type: HighlightType;
  note: string;
  created_at: string;
}

export interface LibraryBookmark {
  id: string;
  book_id: string;
  page_number: number;
  label: string;
  created_at: string;
}

export interface OcrCacheEntry {
  id: string;
  book_id: string;
  page_number: number;
  text_content: string;
  word_boxes: string;
}

export interface ReadingSession {
  id: string;
  book_id: string;
  started_at: string;
  ended_at: string | null;
  pages_read: number;
  start_page: number;
  end_page: number;
}

export interface BookReadingStats {
  totalTimeMinutes: number;
  totalPagesRead: number;
  averagePagesPerSession: number;
  sessionsCount: number;
  lastReadAt: string | null;
}

export interface GlobalReadingStats {
  totalBooksStarted: number;
  totalBooksFinished: number;
  totalTimeMinutes: number;
  totalPagesRead: number;
  currentStreak: number;
  longestStreak: number;
  readingDays: string[];
}

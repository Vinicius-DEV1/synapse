use super::models::{LibraryBookRecord, LibraryCollectionRecord, LibraryStatsRecord};
use synapse_core::domain::library::{BookCollection, BookRecord, LibraryReadingStats};

impl From<BookCollection> for LibraryCollectionRecord {
    fn from(value: BookCollection) -> Self {
        Self {
            id: value.id,
            name: value.name,
            color: value.color,
        }
    }
}

impl From<BookRecord> for LibraryBookRecord {
    fn from(value: BookRecord) -> Self {
        Self {
            id: value.id,
            title: value.title,
            author: value.author,
            file_path: value.file_path,
            drive_file_id: value.drive_file_id,
            cover_color: value.cover_color,
            cover_image: value.cover_image,
            collections: value.collections,
            total_pages: value.total_pages,
            current_page: value.current_page,
            reading_status: value.reading_status,
            last_read_page: value.last_read_page,
            epub_locations: value.epub_locations,
            reading_preferences: value.reading_preferences,
            language: value.language,
            last_read_at: value.last_read_at,
            original_name: value.original_name,
            published_year: value.published_year,
            publisher: value.publisher,
            description: value.description,
            is_local: value.is_local,
            is_archived: value.is_archived,
            archived_at: value.archived_at,
            created_at: value.created_at,
            updated_at: value.updated_at,
            deleted_at: value.deleted_at,
        }
    }
}

impl From<LibraryReadingStats> for LibraryStatsRecord {
    fn from(value: LibraryReadingStats) -> Self {
        Self {
            total_books_started: value.total_books_started,
            total_books_finished: value.total_books_finished,
            total_time_minutes: value.total_time_minutes,
            total_pages_read: value.total_pages_read,
            current_progress_pages: value.current_progress_pages,
            total_highlights: value.total_highlights,
            current_streak: value.current_streak,
            longest_streak: value.longest_streak,
            reading_days: value.reading_days,
        }
    }
}

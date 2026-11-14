//! Domain models for the Library (books, collections, bookmarks, highlights, stats).

use serde::{Deserialize, Serialize};

/// Represents a book item in the library.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookRecord {
    pub id: String,
    pub title: String,
    pub author: Option<String>,
    pub file_path: Option<String>,
    pub drive_file_id: Option<String>,
    pub cover_color: Option<String>,
    pub cover_image: Option<String>,
    pub collections: Option<String>,
    pub total_pages: Option<i32>,
    pub current_page: Option<i32>,
    pub reading_status: Option<String>,
    pub last_read_page: Option<String>,
    pub epub_locations: Option<String>,
    pub reading_preferences: Option<String>,
    pub language: Option<String>,
    pub last_read_at: Option<String>,
    pub original_name: Option<String>,
    pub published_year: Option<i32>,
    pub publisher: Option<String>,
    pub description: Option<String>,
    pub is_local: Option<bool>,
    pub is_archived: Option<bool>,
    pub archived_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

/// Represents a user-defined collection for organizing books.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BookCollection {
    pub id: String,
    pub name: String,
    pub color: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub deleted_at: Option<String>,
}

/// Represents a saved reading bookmark in a book.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bookmark {
    pub id: String,
    pub book_id: String,
    pub page_number: i32,
    pub label: Option<String>,
    pub created_at: Option<String>,
}

/// Represents a text highlight or note within a book.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Highlight {
    pub id: String,
    pub book_id: String,
    pub page_number: i32,
    pub text_content: String,
    pub color: Option<String>,
    pub note: Option<String>,
    pub created_at: Option<String>,
}

/// Consolidated reading statistics and streak metrics.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LibraryReadingStats {
    pub total_books_started: i32,
    pub total_books_finished: i32,
    pub total_time_minutes: i64,
    pub total_pages_read: i64,
    pub total_highlights: i32,
    pub current_streak: i32,
    pub longest_streak: i32,
    pub reading_days: Vec<String>,
}

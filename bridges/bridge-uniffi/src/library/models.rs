#[derive(uniffi::Record, Clone)]
pub struct LibraryBookRecord {
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

#[derive(uniffi::Record, Clone)]
pub struct LibraryStatsRecord {
    pub total_books_started: i32,
    pub total_books_finished: i32,
    pub total_time_minutes: i64,
    pub total_pages_read: i64,
    pub current_progress_pages: i64,
    pub total_highlights: i32,
    pub current_streak: i32,
    pub longest_streak: i32,
    pub reading_days: Vec<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct LibraryCollectionRecord {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(uniffi::Record, Clone)]
pub struct LibraryBookmarkRecord {
    pub id: String,
    pub book_id: String,
    pub page_number: i32,
    pub label: Option<String>,
    pub created_at: Option<String>,
}

impl From<synapse_core::domain::library::Bookmark> for LibraryBookmarkRecord {
    fn from(value: synapse_core::domain::library::Bookmark) -> Self {
        Self {
            id: value.id,
            book_id: value.book_id,
            page_number: value.page_number,
            label: value.label,
            created_at: value.created_at,
        }
    }
}

#[derive(uniffi::Record, Clone)]
pub struct LibraryHighlightRecord {
    pub id: String,
    pub book_id: String,
    pub page_number: i32,
    pub text_content: String,
    pub color: Option<String>,
    pub rects: Option<String>,
    pub highlight_type: Option<String>,
    pub note: Option<String>,
    pub created_at: Option<String>,
}

impl From<synapse_core::domain::library::Highlight> for LibraryHighlightRecord {
    fn from(value: synapse_core::domain::library::Highlight) -> Self {
        Self {
            id: value.id,
            book_id: value.book_id,
            page_number: value.page_number,
            text_content: value.text_content,
            color: value.color,
            rects: value.rects,
            highlight_type: value.highlight_type,
            note: value.note,
            created_at: value.created_at,
        }
    }
}

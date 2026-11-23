#[derive(uniffi::Record, Clone)]
pub struct NoteMetadataRecord {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub icon: String,
    pub updated_at: Option<String>,
    pub is_pinned: bool,
    pub is_locked: bool,
}

#[derive(uniffi::Record, Clone)]
pub struct NotePageRecord {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub content: String,
    pub icon: String,
    pub updated_at: Option<String>,
    pub is_pinned: bool,
    pub is_locked: bool,
    pub is_protected: bool,
    pub editable_as_plain_text: bool,
}

#[derive(uniffi::Record, Clone)]
pub struct NoteTreeNodeRecord {
    pub id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub icon: String,
    pub depth: i32,
    pub has_children: bool,
}

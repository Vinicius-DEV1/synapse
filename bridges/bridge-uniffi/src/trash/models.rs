#[derive(uniffi::Record, Clone)]
pub struct TrashItemRecord {
    pub id: String,
    pub title: String,
    pub item_type: String,
    pub deleted_at: String,
}

#[derive(uniffi::Record, Clone)]
pub struct DiagramMetaRecord {
    pub id: String,
    pub title: String,
    pub icon: String,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(uniffi::Record, Clone)]
pub struct DiagramRecord {
    pub id: String,
    pub title: String,
    pub icon: String,
    pub content: String,
    pub encrypted_content: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

use serde::{Deserialize, Serialize};

pub fn deserialize_i32_flexible<'de, D>(deserializer: D) -> Result<i32, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum IntOrString {
        Int(i32),
        Float(f64),
        String(String),
    }

    match Option::<IntOrString>::deserialize(deserializer)? {
        Some(IntOrString::Int(i)) => Ok(i),
        Some(IntOrString::Float(f)) => Ok(f as i32),
        Some(IntOrString::String(s)) => Ok(s.parse::<i32>().unwrap_or(0)),
        None => Ok(0),
    }
}

pub fn deserialize_option_string_flexible<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrIntOrFloat {
        String(String),
        Int(i64),
        Float(f64),
    }

    match Option::<StringOrIntOrFloat>::deserialize(deserializer)? {
        Some(StringOrIntOrFloat::String(s)) => Ok(Some(s)),
        Some(StringOrIntOrFloat::Int(i)) => Ok(Some(i.to_string())),
        Some(StringOrIntOrFloat::Float(f)) => Ok(Some((f as i64).to_string())),
        None => Ok(None),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Book {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub file_path: Option<String>,
    #[serde(default)]
    pub drive_file_id: Option<String>,
    #[serde(default)]
    pub cover_color: Option<String>,
    #[serde(default)]
    pub cover_image: Option<String>,
    #[serde(default, deserialize_with = "deserialize_i32_flexible")]
    pub total_pages: i32,
    #[serde(default, deserialize_with = "deserialize_i32_flexible")]
    pub current_page: i32,
    #[serde(default)]
    pub reading_status: Option<String>,
    #[serde(default, deserialize_with = "deserialize_option_string_flexible")]
    pub last_read_page: Option<String>,
    #[serde(default)]
    pub epub_locations: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub deleted_at: Option<String>,
    #[serde(default)]
    pub reading_preferences: Option<String>,
    #[serde(default)]
    pub is_local: Option<bool>,
    #[serde(default)]
    pub original_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Collection {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Highlight {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub book_id: String,
    #[serde(default)]
    pub page_number: i32,
    #[serde(default)]
    pub text_content: Option<String>,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub rects: Option<String>,
    #[serde(default)]
    pub highlight_type: Option<String>,
    #[serde(default)]
    pub note: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Bookmark {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub book_id: String,
    #[serde(default)]
    pub page_number: i32,
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub deleted_at: Option<String>,
}

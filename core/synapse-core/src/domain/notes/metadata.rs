use super::models::PageMetaRecord;
use crate::error::Result;
use rusqlite::Connection;

pub fn get_page_metas(conn: &Connection) -> Result<Vec<PageMetaRecord>> {
    get_filtered_page_metas(conn, None)
}

pub fn get_filtered_page_metas(
    conn: &Connection,
    filter: Option<&str>,
) -> Result<Vec<PageMetaRecord>> {
    let mut sql = String::from(
        "SELECT id, parent_id, title, icon, sort_order, created_at, updated_at, \
         deleted_at, cover_image, description, is_pinned, pinned_order, \
         CASE WHEN is_locked != 0 OR encrypted_content IS NOT NULL THEN 1 ELSE 0 END \
         FROM pages WHERE deleted_at IS NULL",
    );
    let query = filter.map(str::trim).filter(|value| !value.is_empty());
    if query.is_some() {
        sql.push_str(" AND title LIKE ?1");
    }
    sql.push_str(" ORDER BY updated_at DESC");
    if query.is_some() {
        sql.push_str(" LIMIT 150");
    }

    let mut statement = conn.prepare(&sql)?;
    let mut rows = match query {
        Some(value) => statement.query([format!("%{value}%")])?,
        None => statement.query([])?,
    };
    let mut pages = Vec::new();
    while let Some(row) = rows.next()? {
        let sort_order = match row.get_ref(4)? {
            rusqlite::types::ValueRef::Integer(value) => value as f64,
            rusqlite::types::ValueRef::Real(value) => value,
            _ => 0.0,
        };
        pages.push(PageMetaRecord {
            id: row.get(0)?,
            parent_id: row.get(1)?,
            title: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            icon: row
                .get::<_, Option<String>>(3)?
                .unwrap_or_else(|| "📄".to_string()),
            sort_order,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
            deleted_at: row.get(7)?,
            cover_image: row.get(8)?,
            description: row.get(9)?,
            is_pinned: row.get::<_, Option<i32>>(10)?.unwrap_or(0),
            pinned_order: row.get::<_, Option<f64>>(11)?.unwrap_or(0.0),
            is_locked: row.get::<_, Option<i32>>(12)?.unwrap_or(0),
        });
    }
    Ok(pages)
}

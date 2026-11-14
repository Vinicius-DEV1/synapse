use super::models::WishlistItem;
use crate::error::{Result, SynapseError};
use chrono::Utc;
use rusqlite::params;

pub fn get_wishlist(conn: &rusqlite::Connection) -> Result<Vec<WishlistItem>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, price, priority, category, link, description, expected_date, created_at, updated_at 
         FROM wishlist 
         WHERE deleted_at IS NULL 
         ORDER BY price DESC",
    )?;

    let items = stmt
        .query_map([], |row| {
            Ok(WishlistItem {
                id: row.get(0)?,
                title: row.get(1)?,
                price: row.get(2)?,
                priority: row.get(3)?,
                category: row.get(4)?,
                link: row.get(5)?,
                description: row.get(6)?,
                expected_date: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;

    Ok(items)
}

pub fn add_wishlist_item(
    conn: &rusqlite::Connection,
    title: &str,
    price: f64,
    priority: Option<&str>,
    category: Option<&str>,
    link: Option<&str>,
    description: Option<&str>,
) -> Result<WishlistItem> {
    let trimmed_title = title.trim();
    if trimmed_title.is_empty() || !price.is_finite() || price < 0.0 {
        return Err(SynapseError::Validation("Invalid title or price".into()));
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let resolved_priority = priority
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("medium");
    let resolved_category = category
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("Geral");
    let resolved_link = link.map(|s| s.trim()).filter(|s| !s.is_empty());
    let resolved_desc = description.map(|s| s.trim()).filter(|s| !s.is_empty());

    conn.execute(
        "INSERT INTO wishlist (id, title, price, priority, category, link, description, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![
            id,
            trimmed_title,
            price,
            resolved_priority,
            resolved_category,
            resolved_link,
            resolved_desc,
            now,
            now
        ],
    )?;

    Ok(WishlistItem {
        id,
        title: trimmed_title.to_string(),
        price,
        priority: resolved_priority.to_string(),
        category: Some(resolved_category.to_string()),
        expected_date: None,
        link: resolved_link.map(String::from),
        description: resolved_desc.map(String::from),
        created_at: Some(now.clone()),
        updated_at: Some(now),
    })
}

pub fn add_wishlist_struct(conn: &rusqlite::Connection, mut item: WishlistItem) -> Result<WishlistItem> {
    let id = if item.id.trim().is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        item.id.trim().to_string()
    };
    let created_at = item.created_at.unwrap_or_else(|| Utc::now().to_rfc3339());

    conn.execute(
        "INSERT INTO wishlist (id, title, price, priority, category, expected_date, description, link, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, item.title, item.price, item.priority, item.category, item.expected_date, item.description, item.link, created_at],
    )?;

    item.id = id;
    item.created_at = Some(created_at);
    Ok(item)
}

pub fn update_wishlist_struct(conn: &rusqlite::Connection, item: WishlistItem) -> Result<i32> {
    let count = conn.execute(
        "UPDATE wishlist SET title = ?, price = ?, priority = ?, category = ?, expected_date = ?, description = ?, link = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![item.title, item.price, item.priority, item.category, item.expected_date, item.description, item.link, item.id],
    )?;

    Ok(count as i32)
}

pub fn delete_wishlist_item(conn: &rusqlite::Connection, item_id: &str) -> Result<bool> {
    let trimmed_id = item_id.trim();
    if trimmed_id.is_empty() {
        return Err(SynapseError::Validation("ID cannot be empty".into()));
    }

    let count = conn.execute(
        "UPDATE wishlist SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![trimmed_id],
    )?;

    Ok(count > 0)
}

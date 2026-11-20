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

pub fn add_wishlist_struct(
    conn: &rusqlite::Connection,
    mut item: WishlistItem,
) -> Result<WishlistItem> {
    if item.priority.trim().is_empty() {
        item.priority = "medium".to_owned();
    }
    validate_wishlist_item(&item)?;
    let id = if item.id.trim().is_empty() {
        uuid::Uuid::new_v4().to_string()
    } else {
        item.id.trim().to_string()
    };
    let now = Utc::now().to_rfc3339();
    let created_at = item.created_at.unwrap_or_else(|| now.clone());
    item.title = item.title.trim().to_owned();
    item.priority = item.priority.trim().to_owned();
    item.category = item
        .category
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    item.expected_date = item
        .expected_date
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    item.description = item
        .description
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    item.link = item
        .link
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());

    conn.execute(
        "INSERT INTO wishlist (id, title, price, priority, category, expected_date, description, link, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        params![id, item.title, item.price, item.priority, item.category, item.expected_date, item.description, item.link, created_at, now],
    )?;

    item.id = id;
    item.created_at = Some(created_at);
    item.updated_at = Some(now);
    Ok(item)
}

pub fn update_wishlist_struct(conn: &rusqlite::Connection, item: WishlistItem) -> Result<i32> {
    validate_wishlist_item(&item)?;
    if item.id.trim().is_empty() {
        return Err(SynapseError::Validation(
            "Wishlist item ID cannot be empty".into(),
        ));
    }
    let title = item.title.trim();
    let priority = item.priority.trim();
    let category = item
        .category
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let expected_date = item
        .expected_date
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let description = item
        .description
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let link = item
        .link
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let count = conn.execute(
        "UPDATE wishlist SET title = ?, price = ?, priority = ?, category = ?, expected_date = ?, description = ?, link = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
        params![title, item.price, priority, category, expected_date, description, link, Utc::now().to_rfc3339(), item.id.trim()],
    )?;

    Ok(count as i32)
}

fn validate_wishlist_item(item: &WishlistItem) -> Result<()> {
    if item.title.trim().is_empty() || !item.price.is_finite() || item.price < 0.0 {
        return Err(SynapseError::Validation(
            "Wishlist title and price are invalid".into(),
        ));
    }
    if !["high", "medium", "low"].contains(&item.priority.trim()) {
        return Err(SynapseError::Validation(
            "Wishlist priority must be high, medium, or low".into(),
        ));
    }
    Ok(())
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

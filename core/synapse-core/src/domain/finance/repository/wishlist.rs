use super::FinanceRepository;
use crate::db::Database;
use crate::domain::finance::{wishlist, WishlistItem};
use crate::error::{Result, SynapseError};

impl FinanceRepository {
    // --- Wishlist ---
    pub fn get_wishlist(db: &Database) -> Result<Vec<WishlistItem>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::get_wishlist_conn(&conn)
    }

    pub fn get_wishlist_conn(conn: &rusqlite::Connection) -> Result<Vec<WishlistItem>> {
        wishlist::get_wishlist(conn)
    }

    pub fn add_wishlist_item(
        db: &Database,
        title: &str,
        price: f64,
        priority: Option<&str>,
        category: Option<&str>,
        link: Option<&str>,
        description: Option<&str>,
    ) -> Result<WishlistItem> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::add_wishlist_item_conn(&conn, title, price, priority, category, link, description)
    }

    pub fn add_wishlist_item_conn(
        conn: &rusqlite::Connection,
        title: &str,
        price: f64,
        priority: Option<&str>,
        category: Option<&str>,
        link: Option<&str>,
        description: Option<&str>,
    ) -> Result<WishlistItem> {
        wishlist::add_wishlist_item(conn, title, price, priority, category, link, description)
    }

    pub fn add_wishlist_struct(
        conn: &rusqlite::Connection,
        item: WishlistItem,
    ) -> Result<WishlistItem> {
        wishlist::add_wishlist_struct(conn, item)
    }

    pub fn update_wishlist_struct(conn: &rusqlite::Connection, item: WishlistItem) -> Result<i32> {
        wishlist::update_wishlist_struct(conn, item)
    }

    pub fn delete_wishlist_item(db: &Database, item_id: &str) -> Result<()> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        Self::delete_wishlist_item_conn(&conn, item_id).map(|_| ())
    }

    pub fn delete_wishlist_conn(conn: &rusqlite::Connection, item_id: &str) -> Result<bool> {
        wishlist::delete_wishlist_item(conn, item_id)
    }

    pub fn delete_wishlist_item_conn(conn: &rusqlite::Connection, item_id: &str) -> Result<bool> {
        wishlist::delete_wishlist_item(conn, item_id)
    }
}

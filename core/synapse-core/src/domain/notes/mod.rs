//! Notes & Pages domain module: page tree, rich text revisions, links metadata, and hierarchy.

pub mod block_ast;
pub mod content;
pub mod crdt_hydrator;
pub mod diff_engine;
pub mod hierarchy;
pub mod history;
pub mod html_normalizer;
pub mod image_cache;
pub mod link_index;
pub mod links;
pub mod mermaid_svg;
pub mod metadata;
pub mod models;
pub mod pages;
pub mod plain_text;
pub mod table_schema;
#[cfg(test)]
pub mod tests;

use crate::db::Database;
use crate::error::{Result, SynapseError};
pub use block_ast::{
    compute_equal_column_widths, extract_loose_file_widget_ids, parse_note_blocks,
    serialize_note_blocks, split_rich_html_at_text_offset, NoteBlock,
};
pub use crdt_hydrator::hydrate_html_from_crdt;
pub use diff_engine::{
    apply_search_replace, compute_word_diff_html, parse_search_replace_blocks, SearchReplaceBlock,
    SearchReplaceResult,
};
pub use html_normalizer::normalize_tiptap_rich_html;
pub use link_index::{
    build_default_link_entity_json, canonical_link_url, find_duplicate_links, normalize_link_url,
    DuplicateLinkMatch,
};
pub use mermaid_svg::{render_mermaid_data_uri, render_mermaid_svg};
pub use models::{LinkMetadata, PageMetaRecord, PageNode, PageRecord, PageRevision};
pub use table_schema::{
    evaluate_table_filter, evaluate_table_filter_at, filter_table_rows_for_view, move_table_column,
    move_table_column_at, move_table_row, move_table_row_at, parse_table_columns,
    parse_table_columns_at, update_table_column_schema_at, update_table_column_width_at,
    validate_table_cells, validate_table_cells_at, TableCellValidation, TableColumnConfig,
};

pub struct NotesRepository;

impl NotesRepository {
    pub fn get_pages(db: &Database, filter: Option<&str>) -> Result<Vec<PageRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        pages::get_pages(&conn, filter)
    }

    pub fn get_pages_conn(
        conn: &rusqlite::Connection,
        filter: Option<&str>,
    ) -> Result<Vec<PageRecord>> {
        pages::get_pages(conn, filter)
    }

    pub fn get_page_metas(db: &Database) -> Result<Vec<PageMetaRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        metadata::get_page_metas(&conn)
    }

    pub fn get_filtered_page_metas(
        db: &Database,
        filter: Option<&str>,
    ) -> Result<Vec<PageMetaRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        metadata::get_filtered_page_metas(&conn, filter)
    }

    pub fn get_page_metas_conn(conn: &rusqlite::Connection) -> Result<Vec<PageMetaRecord>> {
        metadata::get_page_metas(conn)
    }

    pub fn get_pinned_pages(db: &Database) -> Result<Vec<PageRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        pages::get_pinned_pages(&conn)
    }

    pub fn get_recent_pages(db: &Database, limit: usize) -> Result<Vec<PageRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        pages::get_recent_pages(&conn, limit)
    }

    pub fn get_page(db: &Database, page_id: &str) -> Result<Option<PageRecord>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        pages::get_page(&conn, page_id)
    }

    pub fn get_page_conn(conn: &rusqlite::Connection, page_id: &str) -> Result<Option<PageRecord>> {
        pages::get_page(conn, page_id)
    }

    pub fn create_page(
        db: &Database,
        parent_id: Option<&str>,
        title: &str,
        icon: Option<&str>,
    ) -> Result<PageRecord> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        pages::create_page(&conn, parent_id, title, icon)
    }

    pub fn save_plain_text_page(
        db: &Database,
        id: &str,
        title: &str,
        content: &str,
        icon: &str,
    ) -> Result<bool> {
        let mut conn = db.lock().map_err(SynapseError::Database)?;
        plain_text::save_plain_text_page(&mut conn, id, title, content, icon)
    }

    pub fn can_edit_as_plain_text(page: &PageRecord) -> bool {
        plain_text::is_plain_text_page_editable(page)
    }

    pub fn extract_plain_text(content: &str) -> Option<String> {
        plain_text::extract_plain_text(content)
    }

    pub fn save_page(
        db: &Database,
        id: &str,
        title: &str,
        content: &str,
        encrypted_content: Option<&str>,
        icon: &str,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        pages::save_page(&conn, id, title, content, encrypted_content, icon)
    }

    pub fn save_page_conn(
        conn: &rusqlite::Connection,
        id: &str,
        title: &str,
        content: &str,
        encrypted_content: Option<&str>,
        icon: &str,
    ) -> Result<bool> {
        pages::save_page(conn, id, title, content, encrypted_content, icon)
    }

    pub fn rename_page(db: &Database, page_id: &str, title: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        pages::rename_page(&conn, page_id, title)
    }

    pub fn update_page_icon(db: &Database, page_id: &str, icon: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        pages::update_page_icon(&conn, page_id, icon)
    }

    pub fn update_page_description(
        db: &Database,
        page_id: &str,
        description: &str,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        pages::update_page_description(&conn, page_id, description)
    }

    pub fn update_page_cover(
        db: &Database,
        page_id: &str,
        cover_image: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        pages::update_page_cover(&conn, page_id, cover_image)
    }

    pub fn toggle_pin_page(db: &Database, page_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        pages::toggle_pin_page(&conn, page_id)
    }

    pub fn soft_delete_page_subtree(db: &Database, page_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        pages::soft_delete_page_subtree(&conn, page_id)
    }

    pub fn restore_page(db: &Database, page_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        pages::restore_page(&conn, page_id)
    }

    pub fn get_page_tree(db: &Database, filter: Option<&str>) -> Result<Vec<PageNode>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        hierarchy::get_page_tree(&conn, filter)
    }

    pub fn move_page(db: &Database, page_id: &str, new_parent_id: Option<&str>) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        hierarchy::move_page(&conn, page_id, new_parent_id)
    }

    pub fn reorder_pages(
        db: &Database,
        parent_id: Option<&str>,
        page_ids: &[String],
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        hierarchy::reorder_pages(&conn, parent_id, page_ids)
    }

    pub fn record_page_history(
        db: &Database,
        page_id: &str,
        content: &str,
        encrypted_content: Option<&str>,
    ) -> Result<String> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        history::record_page_history(&conn, page_id, content, encrypted_content)
    }

    pub fn record_page_history_conn(
        conn: &rusqlite::Connection,
        page_id: &str,
        content: &str,
        encrypted_content: Option<&str>,
    ) -> Result<String> {
        history::record_page_history(conn, page_id, content, encrypted_content)
    }

    pub fn soft_delete_pages_batch_conn(
        conn: &rusqlite::Connection,
        ids: &[String],
    ) -> Result<bool> {
        pages::soft_delete_pages_batch(conn, ids)
    }

    pub fn get_deleted_page_metas_conn(conn: &rusqlite::Connection) -> Result<Vec<PageMetaRecord>> {
        pages::get_deleted_page_metas(conn)
    }

    pub fn reorder_pages_batch_conn(
        conn: &rusqlite::Connection,
        updates: &[(String, f64)],
    ) -> Result<bool> {
        pages::reorder_pages_batch(conn, updates)
    }

    pub fn get_page_history(db: &Database, page_id: &str) -> Result<Vec<PageRevision>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        history::get_page_history(&conn, page_id)
    }

    pub fn get_page_revision(
        db: &Database,
        page_id: &str,
        revision_id: &str,
    ) -> Result<Option<PageRevision>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        history::get_page_revision(&conn, page_id, revision_id)
    }

    pub fn restore_page_revision(db: &Database, page_id: &str, revision_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        history::restore_page_revision(&conn, page_id, revision_id)
    }

    pub fn get_link_metadata(db: &Database, url: &str) -> Result<Option<LinkMetadata>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        links::get_link_metadata(&conn, url)
    }

    pub fn save_link_metadata(db: &Database, meta: &LinkMetadata) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        links::save_link_metadata(&conn, meta)
    }

    pub fn delete_link_metadata(db: &Database, url: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        links::delete_link_metadata(&conn, url)
    }

    pub fn get_link_entity(db: &Database, canonical_url: &str) -> Result<Option<String>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        links::get_link_entity(&conn, canonical_url)
    }

    pub fn save_link_entity(db: &Database, canonical_url: &str, entity_json: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        links::save_link_entity(&conn, canonical_url, entity_json)
    }

    pub fn find_duplicate_links(
        db: &Database,
        url: &str,
        exclude_page_id: Option<&str>,
    ) -> Result<Vec<DuplicateLinkMatch>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        link_index::find_duplicate_links(&conn, url, exclude_page_id)
    }

    pub fn get_cached_image_data_uri(
        db: &Database,
        image_id: &str,
        key_hex: Option<&str>,
    ) -> Result<Option<String>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        image_cache::get_cached_image_data_uri(&conn, image_id, key_hex)
    }

    pub fn put_cached_image_bytes(
        db: &Database,
        image_id: &str,
        raw_bytes: &[u8],
        mime_type: Option<&str>,
        key_hex: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        image_cache::put_cached_image_bytes(&conn, image_id, raw_bytes, mime_type, key_hex)
    }

    pub fn delete_cached_image(db: &Database, image_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        image_cache::delete_cached_image(&conn, image_id)
    }
}

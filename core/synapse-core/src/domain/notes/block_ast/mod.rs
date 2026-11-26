//! TipTap HTML <-> Typed Block AST parser, serializer, column rebalancing & loose file scanner.

mod cursor_split;
mod entities;
pub(super) mod helpers;
mod parser;
mod serializer;
#[cfg(test)]
mod tests;

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub use cursor_split::split_rich_html_at_text_offset;
pub use parser::parse_note_blocks;
pub use serializer::serialize_note_blocks;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NoteBlock {
    pub id: String,
    pub block_type: String,
    pub attrs: BTreeMap<String, String>,
    pub html: String,
    pub inner_html: String,
}

/// Computes balanced percentage widths (rounded to 1 decimal, summing cleanly) for `2..=5` columns.
pub fn compute_equal_column_widths(column_count: usize) -> Vec<f64> {
    let clamped = column_count.clamp(1, 5);
    let each = (1000.0 / clamped as f64).floor() / 10.0;
    let mut widths = vec![each; clamped];
    let sum_rest: f64 = widths[..clamped.saturating_sub(1)].iter().sum();
    if let Some(last) = widths.last_mut() {
        *last = ((100.0 - sum_rest) * 10.0).round() / 10.0;
    }
    widths
}

/// Extracts all loose `fileWidget` identifiers (`data-file-id` / `fileId`) from a page's HTML.
/// Used by DocumentBundle to offer absorbing loose page documents into a bundle.
pub fn extract_loose_file_widget_ids(html: &str) -> Vec<String> {
    let blocks = parse_note_blocks(html);
    let mut ids = Vec::new();
    for blk in blocks {
        if blk.block_type == "fileWidget" {
            let fid = blk
                .attrs
                .get("data-file-id")
                .or_else(|| blk.attrs.get("fileId"))
                .map(|s| s.trim().to_string())
                .unwrap_or_default();
            if !fid.is_empty() && !ids.contains(&fid) {
                ids.push(fid);
            }
        }
    }
    ids
}

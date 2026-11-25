use super::*;

#[test]
fn roundtrips_mixed_rich_and_widget_blocks() {
    let html = "<p>Intro</p><div data-type=\"question-block\" data-battery-id=\"bat-1\" data-cached-title=\"Rust Quiz\"></div><p>Outro</p>";
    let blocks = parse_note_blocks(html);
    assert_eq!(blocks.len(), 3);
    assert_eq!(blocks[0].block_type, "richText");
    assert_eq!(blocks[1].block_type, "questionBlock");
    assert_eq!(
        blocks[1].attrs.get("data-battery-id").map(String::as_str),
        Some("bat-1")
    );
    assert_eq!(blocks[2].block_type, "richText");
    let serialized = serialize_note_blocks(&blocks);
    assert!(serialized.contains("data-battery-id=\"bat-1\""));
    assert!(serialized.contains("<p>Intro</p>"));
    assert!(serialized.contains("<p>Outro</p>"));
}

#[test]
fn parses_and_roundtrips_code_blocks_and_colored_blockquotes() {
    let html = "<pre><code class=\"language-rust\">fn main() {}</code></pre><blockquote data-color=\"#8b5cf6\"><p>Callout</p></blockquote>";
    let blocks = parse_note_blocks(html);
    assert_eq!(blocks.len(), 2);
    assert_eq!(blocks[0].block_type, "codeBlock");
    assert_eq!(
        blocks[0].attrs.get("language").map(String::as_str),
        Some("rust")
    );
    assert_eq!(
        blocks[0].attrs.get("code").map(String::as_str),
        Some("fn main() {}")
    );
    assert_eq!(blocks[1].block_type, "blockquote");
    assert_eq!(
        blocks[1].attrs.get("color").map(String::as_str),
        Some("#8b5cf6")
    );
    let out = serialize_note_blocks(&blocks);
    assert!(out.contains("<code class=\"language-rust\">fn main() {}</code>"));
    assert!(out.contains("data-color=\"#8b5cf6\""));
}

#[test]
fn balances_column_widths_up_to_five_and_extracts_loose_files() {
    assert_eq!(compute_equal_column_widths(3), vec![33.3, 33.3, 33.4]);
    assert_eq!(
        compute_equal_column_widths(5),
        vec![20.0, 20.0, 20.0, 20.0, 20.0]
    );
    let page = "<p>Hi</p><div data-type=\"file-widget\" data-file-id=\"f1\"></div><div class=\"file-widget\" data-file-id=\"f2\"></div>";
    assert_eq!(extract_loose_file_widget_ids(page), vec!["f1", "f2"]);
}

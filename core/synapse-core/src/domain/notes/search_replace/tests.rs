use super::*;

#[test]
fn parses_and_applies_search_replace() {
    let ai_out = "<<<<<<< SEARCH\nhello world\n=======\nhello rust\n>>>>>>>";
    let blocks = parse_search_replace_blocks(ai_out);
    assert_eq!(blocks.len(), 1);
    let result = apply_search_replace("alpha\nhello world\nomega", &blocks);
    assert!(result.success);
    assert_eq!(result.parsed_count, 1);
    assert_eq!(result.replaced_count, 1);
    assert_eq!(result.result, "alpha\nhello rust\nomega");
}

#[test]
fn parses_react_marker_whitespace_and_skips_malformed_patches() {
    let ai_out = concat!(
        "broken <<<<<<< SEARCH without a separator\n",
        "<<<<<<<  SEARCH  \nold value\n=======  \nnew value\n>>>>>>>\n",
        "<<<<<<< SEARCH\nsecond\n=======\nchanged\n>>>>>>>"
    );
    let blocks = parse_search_replace_blocks(ai_out);
    assert_eq!(blocks.len(), 2);
    assert_eq!(blocks[0].search, "old value");
    assert_eq!(blocks[0].replace, "new value");
    assert_eq!(blocks[1].search, "second");
    assert_eq!(blocks[1].replace, "changed");
}

#[test]
fn parses_react_optional_newlines_around_inline_delimiters() {
    let blocks = parse_search_replace_blocks("<<<<<<< SEARCH\nold======= \nnew>>>>>>>");
    assert_eq!(
        blocks,
        vec![SearchReplaceBlock {
            search: "old".to_string(),
            replace: "new".to_string(),
        }]
    );
}

#[test]
fn scans_overlapping_start_markers_like_the_react_global_regex() {
    let blocks = parse_search_replace_blocks("<<<<<<<< SEARCH\nold\n=======\nnew\n>>>>>>>");
    assert_eq!(blocks.len(), 1);
    assert_eq!(blocks[0].search, "old");
    assert_eq!(blocks[0].replace, "new");
}

#[test]
fn parses_crlf_patch_delimiters_with_react_capture_boundaries() {
    let blocks = parse_search_replace_blocks("<<<<<<< SEARCH\r\nold\r\n=======\r\nnew\r\n>>>>>>>");
    assert_eq!(blocks.len(), 1);
    assert_eq!(blocks[0].search, "old\r");
    assert_eq!(blocks[0].replace, "new\r");
    let result = apply_search_replace("old\r\n", &blocks);
    assert!(result.success);
    assert_eq!(result.result, "new\r\n");
}

#[test]
fn applies_javascript_string_replacement_tokens_like_react() {
    let result = apply_search_replace(
        "before target after",
        &[SearchReplaceBlock {
            search: "target".to_string(),
            replace: "[$$][$&][$`][$']".to_string(),
        }],
    );
    assert!(result.success);
    assert_eq!(result.result, "before [$][target][before ][ after] after");
}

//! FFI bindings for Block AST parsing/serialization, diffing, CRDT hydration, and table schemas.

use std::ffi::CString;
use std::os::raw::{c_char, c_int};
use synapse_core::domain::notes;

use super::super::helpers::{json_to_c_char, to_opt_str};

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_parse_blocks(html: *const c_char) -> *mut c_char {
    let raw = to_opt_str(html).unwrap_or("");
    let blocks = notes::parse_note_blocks(raw);
    json_to_c_char(&blocks)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_serialize_blocks(blocks_json: *const c_char) -> *mut c_char {
    let Some(raw) = to_opt_str(blocks_json) else {
        return std::ptr::null_mut();
    };
    let blocks: Vec<notes::NoteBlock> = match serde_json::from_str(raw) {
        Ok(b) => b,
        Err(_) => return std::ptr::null_mut(),
    };
    let html = notes::serialize_note_blocks(&blocks);
    CString::new(html)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_apply_search_replace(
    original: *const c_char,
    ai_response: *const c_char,
) -> *mut c_char {
    let orig = to_opt_str(original).unwrap_or("");
    let ai = to_opt_str(ai_response).unwrap_or("");
    let blocks = notes::parse_search_replace_blocks(ai);
    let result = notes::apply_search_replace(orig, &blocks);
    json_to_c_char(&result)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_compute_word_diff_html(
    old_text: *const c_char,
    new_text: *const c_char,
) -> *mut c_char {
    let old_s = to_opt_str(old_text).unwrap_or("");
    let new_s = to_opt_str(new_text).unwrap_or("");
    let diff = notes::compute_word_diff_html(old_s, new_s);
    CString::new(diff)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_hydrate_from_crdt(
    html: *const c_char,
    crdt_base64: *const c_char,
) -> *mut c_char {
    let raw_html = to_opt_str(html).unwrap_or("");
    let raw_crdt = to_opt_str(crdt_base64).unwrap_or("");
    let hydrated = notes::hydrate_html_from_crdt(raw_html, raw_crdt);
    CString::new(hydrated)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_split_rich_html(
    html: *const c_char,
    text_offset: c_int,
) -> *mut c_char {
    let raw = to_opt_str(html).unwrap_or("");
    let offset = text_offset.max(0) as usize;
    let (before, after) = notes::split_rich_html_at_text_offset(raw, offset);
    json_to_c_char(&serde_json::json!({ "before": before, "after": after }))
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_compute_equal_column_widths(
    column_count: c_int,
) -> *mut c_char {
    let count = column_count.clamp(1, 5) as usize;
    json_to_c_char(&notes::compute_equal_column_widths(count))
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_parse_table_columns(
    table_html: *const c_char,
) -> *mut c_char {
    let raw = to_opt_str(table_html).unwrap_or("");
    let cols = notes::parse_table_columns(raw);
    json_to_c_char(&cols)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_parse_table_columns_at(
    note_html: *const c_char,
    table_index: c_int,
) -> *mut c_char {
    let raw = to_opt_str(note_html).unwrap_or("");
    let cols = notes::parse_table_columns_at(raw, table_index.max(0) as usize);
    json_to_c_char(&cols)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_update_table_column_schema_at(
    note_html: *const c_char,
    table_index: c_int,
    column_index: c_int,
    column_type: *const c_char,
    options_json: *const c_char,
    number_format: *const c_char,
    date_format: *const c_char,
) -> *mut c_char {
    let raw = to_opt_str(note_html).unwrap_or("");
    if table_index < 0 || column_index < 0 {
        return CString::new(raw)
            .map(CString::into_raw)
            .unwrap_or(std::ptr::null_mut());
    }
    let col_type = to_opt_str(column_type).unwrap_or("text");
    let options = to_opt_str(options_json).unwrap_or("[]");
    let number = to_opt_str(number_format).unwrap_or("");
    let date = to_opt_str(date_format).unwrap_or("");
    let updated = notes::update_table_column_schema_at(
        raw,
        table_index as usize,
        column_index as usize,
        col_type,
        options,
        number,
        date,
    );
    CString::new(updated)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_update_table_column_width_at(
    note_html: *const c_char,
    table_index: c_int,
    column_index: c_int,
    width_px: c_int,
) -> *mut c_char {
    let raw = to_opt_str(note_html).unwrap_or("");
    if table_index < 0 || column_index < 0 || width_px < 0 {
        return CString::new(raw)
            .map(CString::into_raw)
            .unwrap_or(std::ptr::null_mut());
    }
    let updated = notes::update_table_column_width_at(
        raw,
        table_index as usize,
        column_index as usize,
        width_px as usize,
    );
    CString::new(updated)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_validate_table_cells(
    table_html: *const c_char,
) -> *mut c_char {
    let raw = to_opt_str(table_html).unwrap_or("");
    let validations = notes::validate_table_cells(raw);
    json_to_c_char(&validations)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_validate_table_cells_at(
    note_html: *const c_char,
    table_index: c_int,
) -> *mut c_char {
    let raw = to_opt_str(note_html).unwrap_or("");
    let validations = notes::validate_table_cells_at(raw, table_index.max(0) as usize);
    json_to_c_char(&validations)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_evaluate_table_filter(
    table_html: *const c_char,
    filters_json: *const c_char,
) -> *mut c_char {
    let raw = to_opt_str(table_html).unwrap_or("");
    let filters = to_opt_str(filters_json).unwrap_or("[]");
    let visible = notes::evaluate_table_filter(raw, filters);
    json_to_c_char(&visible)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_evaluate_table_filter_at(
    note_html: *const c_char,
    table_index: c_int,
    filters_json: *const c_char,
) -> *mut c_char {
    let raw = to_opt_str(note_html).unwrap_or("");
    let filters = to_opt_str(filters_json).unwrap_or("[]");
    let visible = notes::evaluate_table_filter_at(raw, table_index.max(0) as usize, filters);
    json_to_c_char(&visible)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_filter_table_rows_for_view(
    note_html: *const c_char,
    table_index: c_int,
    filters_json: *const c_char,
) -> *mut c_char {
    let raw = to_opt_str(note_html).unwrap_or("");
    let filters = to_opt_str(filters_json).unwrap_or("[]");
    let (html, visible_row_count) =
        notes::filter_table_rows_for_view(raw, table_index.max(0) as usize, filters);
    json_to_c_char(&serde_json::json!({
        "html": html,
        "visibleRowCount": visible_row_count
    }))
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_move_table_column(
    table_html: *const c_char,
    from_col: c_int,
    to_col: c_int,
) -> *mut c_char {
    let raw = to_opt_str(table_html).unwrap_or("");
    if from_col < 0 || to_col < 0 {
        return CString::new(raw)
            .map(CString::into_raw)
            .unwrap_or(std::ptr::null_mut());
    }
    let out = notes::move_table_column(raw, from_col as usize, to_col as usize);
    CString::new(out)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_move_table_column_at(
    note_html: *const c_char,
    table_index: c_int,
    from_col: c_int,
    to_col: c_int,
) -> *mut c_char {
    let raw = to_opt_str(note_html).unwrap_or("");
    if table_index < 0 || from_col < 0 || to_col < 0 {
        return CString::new(raw)
            .map(CString::into_raw)
            .unwrap_or(std::ptr::null_mut());
    }
    let out = notes::move_table_column_at(
        raw,
        table_index as usize,
        from_col as usize,
        to_col as usize,
    );
    CString::new(out)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_move_table_row(
    table_html: *const c_char,
    from_row: c_int,
    to_row: c_int,
) -> *mut c_char {
    let raw = to_opt_str(table_html).unwrap_or("");
    if from_row < 0 || to_row < 0 {
        return CString::new(raw)
            .map(CString::into_raw)
            .unwrap_or(std::ptr::null_mut());
    }
    let out = notes::move_table_row(raw, from_row as usize, to_row as usize);
    CString::new(out)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_move_table_row_at(
    note_html: *const c_char,
    table_index: c_int,
    from_row: c_int,
    to_row: c_int,
) -> *mut c_char {
    let raw = to_opt_str(note_html).unwrap_or("");
    if table_index < 0 || from_row < 0 || to_row < 0 {
        return CString::new(raw)
            .map(CString::into_raw)
            .unwrap_or(std::ptr::null_mut());
    }
    let out = notes::move_table_row_at(
        raw,
        table_index as usize,
        from_row as usize,
        to_row as usize,
    );
    CString::new(out)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_extract_loose_file_ids(html: *const c_char) -> *mut c_char {
    let raw = to_opt_str(html).unwrap_or("");
    let ids = notes::extract_loose_file_widget_ids(raw);
    json_to_c_char(&ids)
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_render_mermaid_data_uri(
    chart: *const c_char,
) -> *mut c_char {
    let raw = to_opt_str(chart).unwrap_or("");
    let uri = notes::render_mermaid_data_uri(raw);
    CString::new(uri)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

#[no_mangle]
pub unsafe extern "C" fn synapse_notes_render_mermaid_svg(chart: *const c_char) -> *mut c_char {
    let raw = to_opt_str(chart).unwrap_or("");
    let svg = notes::render_mermaid_svg(raw);
    CString::new(svg)
        .map(CString::into_raw)
        .unwrap_or(std::ptr::null_mut())
}

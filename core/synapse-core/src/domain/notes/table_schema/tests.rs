use super::*;

#[test]
fn parses_column_types_formats_and_validates_cells() {
    let html = "<table><tr><th data-column-type=\"number\" data-number-format=\"currency\">Valor</th><th data-column-type=\"select\" data-column-options='[\"A\",\"B\"]'>Status</th><th data-column-type=\"date\" data-date-format=\"DD/MM/YYYY\">Data</th></tr><tr><td>R$ 42,50</td><td>A</td><td>25/11/2026</td></tr><tr><td>abc</td><td>Z</td><td>invalid</td></tr></table>";
    let cols = parse_table_columns(html);
    assert_eq!(cols.len(), 3);
    assert_eq!(cols[0].col_type, "number");
    assert_eq!(cols[0].number_format.as_deref(), Some("currency"));
    assert_eq!(cols[1].options, vec!["A", "B"]);
    assert_eq!(cols[2].date_format.as_deref(), Some("DD/MM/YYYY"));
    let validations = validate_table_cells(html);
    assert!(validations[0].valid);
    assert!(validations[1].valid);
    assert!(validations[2].valid);
    assert!(!validations[3].valid);
    assert!(!validations[4].valid);
    assert!(!validations[5].valid);
}

#[test]
fn evaluates_all_numeric_date_text_and_range_filter_operators() {
    let html = "<table><tr><th data-column-type=\"number\">Qtd</th><th data-column-type=\"date\">Data</th><th data-column-type=\"text\">Nome</th></tr><tr><td>10</td><td>2026-01-10</td><td>Alpha</td></tr><tr><td>25</td><td>2026-05-15</td><td>Beta</td></tr><tr><td>50</td><td>2026-12-01</td><td>Gamma</td></tr></table>";

    assert_eq!(
        evaluate_table_filter(html, r#"[{"columnIndex":0,"operator":"gt","value":"15"}]"#),
        vec![2, 3]
    );
    assert_eq!(
        evaluate_table_filter(
            html,
            r#"[{"columnIndex":0,"operator":"between","value":"10","value2":"30"}]"#
        ),
        vec![1, 2]
    );
    assert_eq!(
        evaluate_table_filter(
            html,
            r#"[{"columnIndex":1,"operator":"before","value":"2026-06-01"}]"#
        ),
        vec![1, 2]
    );
    assert_eq!(
        evaluate_table_filter(
            html,
            r#"[{"columnIndex":2,"operator":"not_contains","value":"be"}]"#
        ),
        vec![1, 3]
    );
}

#[test]
fn reorders_table_columns_and_data_rows() {
    let html = "<table><tbody><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></tbody></table>";
    let moved_col = move_table_column(html, 0, 1);
    assert!(moved_col.contains("<tr><th>B</th><th>A</th></tr><tr><td>2</td><td>1</td></tr>"));
    let moved_row = move_table_row(html, 1, 2);
    assert!(moved_row.contains(
        "<tr><th>A</th><th>B</th></tr><tr><td>3</td><td>4</td></tr><tr><td>1</td><td>2</td></tr>"
    ));
}

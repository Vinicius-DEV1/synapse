use super::*;

#[test]
fn stream_cors_does_not_reflect_a_lookalike_localhost_origin() {
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        header::ORIGIN,
        axum::http::HeaderValue::from_static("http://localhost.attacker.example:35174"),
    );

    assert_eq!(get_stream_cors_origin(&headers), "tauri://localhost");
}

#[test]
fn stream_cors_preserves_an_exact_development_origin() {
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        header::ORIGIN,
        axum::http::HeaderValue::from_static("http://localhost:35174"),
    );

    assert_eq!(get_stream_cors_origin(&headers), "http://localhost:35174");
}

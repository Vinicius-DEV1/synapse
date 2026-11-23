pub fn detect_file_type(file_name: &str) -> &'static str {
    let name = file_name.to_lowercase();
    match name.rsplit_once('.').map(|(_, extension)| extension) {
        Some("pdf") => "pdf",
        Some("png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" | "bmp" | "ico" | "tif" | "tiff") => {
            "image"
        }
        Some("mp4" | "mkv" | "webm" | "mov" | "avi" | "flv" | "wmv" | "m4v") => "video",
        Some("epub") => "epub",
        Some("ppt" | "pptx" | "key" | "odp") => "slide",
        Some(
            "txt" | "md" | "markdown" | "json" | "csv" | "xml" | "js" | "ts" | "jsx" | "tsx"
            | "css" | "html" | "log" | "yaml" | "yml" | "toml" | "ini" | "env",
        ) => "text",
        Some("zip" | "rar" | "7z" | "tar" | "gz" | "bz2" | "xz") => "archive",
        _ => "other",
    }
}

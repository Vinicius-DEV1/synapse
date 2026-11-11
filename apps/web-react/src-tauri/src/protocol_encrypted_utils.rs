use std::path::{Path, PathBuf};
use tauri::http::Request;

pub fn get_mime_type(path: &Path) -> String {
    let path_for_mime = if path.to_string_lossy().ends_with(".enc") {
        path.with_extension("")
    } else {
        path.to_path_buf()
    };
    mime_guess::from_path(&path_for_mime)
        .first_or_octet_stream()
        .to_string()
}

pub fn is_path_confined(path: &Path, base_dir: &Path) -> bool {
    let canonical_base = match base_dir.canonicalize() {
        Ok(b) => b,
        Err(_) => base_dir.to_path_buf(),
    };

    if let Ok(canon) = path.canonicalize() {
        if canon.starts_with(&canonical_base) && canon.is_file() {
            return true;
        }
        // Fallback for debug/release local folder during development
        if let Some(parent) = base_dir.parent() {
            if let Some(grandparent) = parent.parent() {
                let release_dir = grandparent.join("release").join("data");
                if let Ok(canon_release) = release_dir.canonicalize() {
                    if canon.starts_with(&canon_release) && canon.is_file() {
                        return true;
                    }
                }
            }
        }
    }
    false
}

pub fn find_file(module_name: &str, decoded_path: &str) -> Option<PathBuf> {
    let dir_name = match module_name {
        "culture" => "videos",
        "library" => "library",
        "files" => "files",
        "focus" => "lofi",
        _ => module_name,
    };

    let base_dir = crate::get_app_data_dir();
    let module_dir = base_dir.join(dir_name);

    // Direct absolute path check (if passed): strictly confined within application data directory
    let direct_path = PathBuf::from(decoded_path);
    if direct_path.is_absolute() {
        if is_path_confined(&direct_path, &base_dir) {
            return direct_path.canonicalize().ok();
        }
        let direct_with_enc = PathBuf::from(format!("{}.enc", decoded_path));
        if is_path_confined(&direct_with_enc, &base_dir) {
            return direct_with_enc.canonicalize().ok();
        }
        return None;
    }

    let clean_relative = if decoded_path.starts_with(&format!("{}/", dir_name)) {
        &decoded_path[dir_name.len() + 1..]
    } else if decoded_path.starts_with(&format!("{}\\", dir_name)) {
        &decoded_path[dir_name.len() + 1..]
    } else if decoded_path.starts_with(&format!("{}/", module_name)) {
        &decoded_path[module_name.len() + 1..]
    } else if decoded_path.starts_with(&format!("{}\\", module_name)) {
        &decoded_path[module_name.len() + 1..]
    } else {
        decoded_path
    };

    let target_path = module_dir.join(clean_relative);
    if is_path_confined(&target_path, &base_dir) {
        return target_path.canonicalize().ok();
    }

    // Try with .enc suffix if not present
    if !clean_relative.ends_with(".enc") {
        let target_enc = module_dir.join(format!("{}.enc", clean_relative));
        if is_path_confined(&target_enc, &base_dir) {
            return target_enc.canonicalize().ok();
        }
    }

    None
}

pub fn get_safe_cors_origin(request: &Request<Vec<u8>>) -> String {
    if let Some(origin) = request.headers().get("origin").and_then(|v| v.to_str().ok()) {
        if origin.starts_with("tauri://")
            || origin.starts_with("http://localhost")
            || origin.starts_with("http://127.0.0.1")
            || origin.starts_with("http://tauri.localhost")
        {
            return origin.to_string();
        }
    }
    "tauri://localhost".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_path_confined_rejects_external_paths() {
        let temp_dir = std::env::temp_dir();
        let base_dir = temp_dir.join("caderno_safe_base");
        let _ = std::fs::create_dir_all(&base_dir);

        let outside_file = temp_dir.join("outside_secret.txt");
        let _ = std::fs::write(&outside_file, b"secret");

        assert!(!is_path_confined(&outside_file, &base_dir));

        let _ = std::fs::remove_file(outside_file);
        let _ = std::fs::remove_dir_all(base_dir);
    }

    #[test]
    fn test_is_path_confined_accepts_confined_file() {
        let temp_dir = std::env::temp_dir();
        let base_dir = temp_dir.join("caderno_safe_base_2");
        let _ = std::fs::create_dir_all(&base_dir);

        let inside_file = base_dir.join("safe.txt");
        let _ = std::fs::write(&inside_file, b"content");

        assert!(is_path_confined(&inside_file, &base_dir));

        let _ = std::fs::remove_file(inside_file);
        let _ = std::fs::remove_dir_all(base_dir);
    }

    #[test]
    fn test_find_file_rejects_arbitrary_absolute_path() {
        let res = find_file("culture", "/etc/passwd");
        assert!(res.is_none());

        let res2 = find_file("notes", "../../../../etc/shadow");
        assert!(res2.is_none());
    }
}

use super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

fn setup_test_db() -> (Database, NamedTempFile) {
    let temp_file = NamedTempFile::new().expect("Failed to create temp file");
    let db = Database::open(temp_file.path()).expect("Failed to open database");
    (db, temp_file)
}

#[test]
fn test_video_crud_and_query() {
    let (db, _temp) = setup_test_db();

    let video = VideoRecord {
        id: "vid-1".to_string(),
        title: "Rust Deep Dive".to_string(),
        original_name: "rust.mp4".to_string(),
        duration: Some(1200.5),
        file_path: Some("/media/rust.mp4".to_string()),
        progress: Some(300.0),
        is_local: Some(1),
        collection_id: Some("col-1".to_string()),
        collection_name: Some("Programming".to_string()),
        drive_file_id: None,
        drive_web_file_id: None,
        drive_subtitle_id: None,
        local_subtitle_path: None,
        subtitles_json: Some("[]".to_string()),
        audio_tracks_json: None,
        youtube_url: None,
        youtube_description: None,
        created_at: None,
        updated_at: None,
        deleted_at: None,
    };

    VideoRepository::insert_video(&db, &video).expect("Insert video failed");

    let fetched = VideoRepository::get_video(&db, "vid-1").expect("Get video failed");
    assert!(fetched.is_some());
    let fetched = fetched.unwrap();
    assert_eq!(fetched.title, "Rust Deep Dive");
    assert_eq!(fetched.duration, Some(1200.5));

    // Update progress
    assert!(VideoRepository::update_video_progress(&db, "vid-1", 450.0).expect("Update progress"));
    let fetched_after = VideoRepository::get_video(&db, "vid-1").unwrap().unwrap();
    assert_eq!(fetched_after.progress, Some(450.0));

    // Filter queries
    let all = VideoRepository::get_videos(&db, None).expect("Get all videos");
    assert_eq!(all.len(), 1);

    let filtered = VideoRepository::get_videos(&db, Some("col-1")).expect("Get filtered");
    assert_eq!(filtered.len(), 1);

    let filtered_none =
        VideoRepository::get_videos(&db, Some("Other")).expect("Get filtered other");
    assert_eq!(filtered_none.len(), 0);

    // Soft delete
    assert!(VideoRepository::soft_delete_video(&db, "vid-1").expect("Delete video"));
    let all_after_del = VideoRepository::get_videos(&db, None).expect("Get all after delete");
    assert_eq!(all_after_del.len(), 0);
}

#[test]
fn test_video_folders_workflow() {
    let (db, _temp) = setup_test_db();

    let folder = VideoRepository::create_video_folder(&db, "Sci-Fi").expect("Create folder");
    assert!(folder.is_some());
    let folder = folder.unwrap();
    assert_eq!(folder.name, "Sci-Fi");

    let folders_list = VideoRepository::get_video_folders(&db).expect("Get folders");
    assert_eq!(folders_list.len(), 1);
    assert_eq!(folders_list[0].name, "Sci-Fi");

    assert!(
        VideoRepository::rename_video_folder(&db, &folder.id, "Science Fiction")
            .expect("Rename folder")
    );
    let renamed_list = VideoRepository::get_video_folders(&db).expect("Get folders after rename");
    assert_eq!(renamed_list[0].name, "Science Fiction");

    assert!(VideoRepository::delete_video_folder(&db, &folder.id).expect("Delete folder"));
    let empty_list = VideoRepository::get_video_folders(&db).expect("Get folders after delete");
    assert_eq!(empty_list.len(), 0);
}

#[test]
fn test_video_subtitles_and_words() {
    let (db, _temp) = setup_test_db();
    let conn = db.lock().unwrap();

    let video = VideoRecord {
        id: "vid-sub".to_string(),
        title: "Subtitle Test".to_string(),
        original_name: "test.mp4".to_string(),
        duration: Some(100.0),
        file_path: Some("/media/test.mp4".to_string()),
        progress: Some(0.0),
        is_local: Some(1),
        collection_id: None,
        collection_name: None,
        drive_file_id: None,
        drive_web_file_id: None,
        drive_subtitle_id: None,
        local_subtitle_path: None,
        subtitles_json: Some(
            r#"[{"id":"sub_1","label":"English","local_path":"/subs/en.vtt"}]"#.to_string(),
        ),
        audio_tracks_json: None,
        youtube_url: None,
        youtube_description: None,
        created_at: None,
        updated_at: None,
        deleted_at: None,
    };
    catalog::insert_video(&conn, &video).unwrap();

    // Subtitle rename
    assert!(subtitles::rename_video_subtitle(&conn, "vid-sub", "sub_1", "English (UK)").unwrap());

    // Subtitle remove
    let removed_path = subtitles::remove_video_subtitle(&conn, "vid-sub", "sub_1").unwrap();
    assert_eq!(removed_path, Some("/subs/en.vtt".to_string()));

    // Words
    let word = words::add_video_word(
        &conn,
        "vid-sub",
        "serendipity",
        Some("a happy accident"),
        42.5,
    )
    .unwrap();
    assert_eq!(word.word, "serendipity");

    let words_list = words::get_video_words(&conn, "vid-sub").unwrap();
    assert_eq!(words_list.len(), 1);
    assert_eq!(words_list[0].word, "serendipity");

    assert!(words::delete_video_word(&conn, &word.id).unwrap());
    let words_after = words::get_video_words(&conn, "vid-sub").unwrap();
    assert_eq!(words_after.len(), 0);
}

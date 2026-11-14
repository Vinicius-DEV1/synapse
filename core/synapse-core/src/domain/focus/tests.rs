use super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_focus_domain() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();

    // Lofi track
    assert!(FocusRepository::add_lofi_track(&db, "Chill Beats", "/path/chill.mp3", 120.0).expect("add lofi"));
    let lofis = FocusRepository::get_lofis(&db).expect("get lofis");
    assert_eq!(lofis.len(), 1);
    assert_eq!(lofis[0].title, "Chill Beats");

    // Focus session
    assert!(FocusRepository::record_session(&db, "Estudo", 25, "completed", "Math done", "Algebra").expect("record"));
    let sessions = FocusRepository::get_sessions(&db).expect("get sessions");
    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0].tag, "Estudo");
    assert_eq!(sessions[0].target_time_minutes, 25);

    // Alarm
    assert!(FocusRepository::create_alarm(&db, "07:30", "Morning", "bell", true, "[\"mon\"]").expect("create alarm"));
    let alarms = FocusRepository::get_alarms(&db).expect("get alarms");
    assert_eq!(alarms.len(), 1);
    assert_eq!(alarms[0].time, "07:30");
    assert_eq!(alarms[0].enabled, 1);

    // Toggle alarm
    assert!(FocusRepository::toggle_alarm(&db, &alarms[0].id).expect("toggle alarm"));
    let alarms_after = FocusRepository::get_alarms(&db).expect("get alarms");
    assert_eq!(alarms_after[0].enabled, 0);
}

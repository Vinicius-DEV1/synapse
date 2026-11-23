use super::*;
use crate::db::Database;
use tempfile::NamedTempFile;

#[test]
fn test_habits_lifecycle_and_toggle() {
    let temp_db = NamedTempFile::new().unwrap();
    let db = Database::open(temp_db.path()).unwrap();

    // 1. Initial list empty
    let habits = HabitsRepository::get_habits(&db).unwrap();
    assert!(habits.is_empty());

    // 2. Create habit
    let habit = HabitsRepository::create_habit(
        &db,
        "Drink Water",
        Some("#06b6d4"),
        Some("droplet"),
        Some(7),
    )
    .unwrap();
    assert_eq!(habit.title, "Drink Water");
    assert_eq!(habit.target_days_per_week, 7);

    // 3. Toggle habit (check)
    let checked = HabitsRepository::toggle_habit_checkin(&db, &habit.id, "2026-11-14").unwrap();
    assert!(checked);

    let logs = HabitsRepository::get_habit_logs_range(&db, "2026-11-01", "2026-11-30").unwrap();
    assert_eq!(logs.len(), 1);
    assert_eq!(logs[0].habit_id, habit.id);
    assert_eq!(logs[0].date, "2026-11-14");

    // 4. Toggle habit again (uncheck)
    let checked_again = HabitsRepository::toggle_habit_checkin(&db, &habit.id, "2026-11-14").unwrap();
    assert!(!checked_again);

    let logs = HabitsRepository::get_habit_logs_range(&db, "2026-11-01", "2026-11-30").unwrap();
    assert!(logs.is_empty());

    // 5. Delete habit
    HabitsRepository::delete_habit(&db, &habit.id).unwrap();
    let habits = HabitsRepository::get_habits(&db).unwrap();
    assert!(habits.is_empty());
}

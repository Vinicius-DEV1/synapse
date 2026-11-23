use super::models::{HabitLog, HabitStats};
use chrono::{Duration, NaiveDate};
use std::collections::HashSet;

pub fn calculate_habit_stats(logs: &[HabitLog], today: NaiveDate) -> HabitStats {
    let completed_dates: HashSet<NaiveDate> = logs
        .iter()
        .filter_map(|log| NaiveDate::parse_from_str(log.date.trim(), "%Y-%m-%d").ok())
        .collect();

    let mut current_streak = 0;
    let mut cursor = if completed_dates.contains(&today) {
        Some(today)
    } else {
        let yesterday = today - Duration::days(1);
        completed_dates.contains(&yesterday).then_some(yesterday)
    };
    while let Some(date) = cursor {
        current_streak += 1;
        let previous = date - Duration::days(1);
        cursor = completed_dates.contains(&previous).then_some(previous);
    }

    let mut sorted_dates: Vec<NaiveDate> = completed_dates.iter().copied().collect();
    sorted_dates.sort_unstable();
    let mut best_streak = 0;
    let mut current_chain = 0;
    let mut last_date: Option<NaiveDate> = None;
    for date in sorted_dates {
        current_chain = match last_date {
            Some(previous) if date == previous + Duration::days(1) => current_chain + 1,
            _ => 1,
        };
        best_streak = best_streak.max(current_chain);
        last_date = Some(date);
    }

    let completed_last_30_days = (0..30)
        .filter(|offset| completed_dates.contains(&(today - Duration::days(*offset))))
        .count();

    HabitStats {
        current_streak,
        best_streak,
        total_completed: completed_dates.len() as i32,
        completion_rate_30_days: ((completed_last_30_days as f64 / 30.0) * 100.0).round() as i32,
    }
}

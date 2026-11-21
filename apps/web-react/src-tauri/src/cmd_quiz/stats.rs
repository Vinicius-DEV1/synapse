use crate::cmd_quiz::attempts::load_latest_attempts_conn;
use crate::cmd_quiz::batteries::map_battery_row;
use crate::cmd_quiz::questions::map_question_row;
use crate::cmd_quiz::types::{
    BatteryWithQuestionsDto, LinkedPageInfo, QuizAttemptDto, QuizBatteryDto, QuizQuestionDto,
    QuizStatsDto, TagStatEntry,
};
use crate::db::DbState;
use rusqlite::params;
use std::collections::{HashMap, HashSet};
use tauri::State;

#[tauri::command]
pub fn quiz_get_stats(db_state: State<'_, DbState>) -> Result<QuizStatsDto, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt_b = conn
        .prepare("SELECT id FROM quiz_batteries WHERE deleted_at IS NULL")
        .map_err(|e| e.to_string())?;
    let active_battery_ids: HashSet<String> = stmt_b
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    let mut stmt_q = conn
        .prepare(
            "SELECT id, battery_id, type, question, options, correct_index, expected_answer, explanation, tags, sort_order, created_at, updated_at, deleted_at
             FROM quiz_questions
             WHERE deleted_at IS NULL",
        )
        .map_err(|e| e.to_string())?;
    let questions: Vec<QuizQuestionDto> = stmt_q
        .query_map([], map_question_row)
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|q| active_battery_ids.contains(&q.battery_id))
        .collect();

    let latest_attempts = load_latest_attempts_conn(conn, None)?;

    let mut answered_count = 0;
    let mut correct_count = 0;
    let mut incorrect_count = 0;
    let mut tag_stats: HashMap<String, TagStatEntry> = HashMap::new();

    for q in &questions {
        let attempt = latest_attempts.get(&q.id);
        let is_answered = attempt.is_some();
        let is_correct = attempt.map(|a| a.is_correct).unwrap_or(false);

        if is_answered {
            answered_count += 1;
            if is_correct {
                correct_count += 1;
            } else {
                incorrect_count += 1;
            }
        }

        let tags: Vec<String> = if q.tags.is_empty() {
            vec!["Geral".to_string()]
        } else {
            q.tags.clone()
        };

        for t in tags {
            let norm_tag = t.trim().to_lowercase();
            if norm_tag.is_empty() {
                continue;
            }
            let entry = tag_stats.entry(norm_tag).or_default();
            entry.total += 1;
            if is_answered {
                entry.answered += 1;
                if is_correct {
                    entry.correct += 1;
                }
            }
        }
    }

    let accuracy_rate = if answered_count > 0 {
        ((correct_count as f64 / answered_count as f64) * 100.0).round() as i32
    } else {
        0
    };

    Ok(QuizStatsDto {
        total_batteries: active_battery_ids.len() as i32,
        total_questions: questions.len() as i32,
        answered_questions: answered_count,
        correct_answers: correct_count,
        incorrect_answers: incorrect_count,
        accuracy_rate,
        tag_stats,
    })
}

#[tauri::command]
pub fn quiz_get_battery_with_questions(
    battery_id: String,
    db_state: State<'_, DbState>,
) -> Result<Option<BatteryWithQuestionsDto>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let battery = match conn.query_row(
        "SELECT id, parent_id, page_id, title, description, layout, tags, sort_order, created_at, updated_at, deleted_at
         FROM quiz_batteries WHERE id = ?1 AND deleted_at IS NULL",
        params![battery_id],
        map_battery_row,
    ) {
        Ok(b) => b,
        Err(rusqlite::Error::QueryReturnedNoRows) => return Ok(None),
        Err(e) => return Err(e.to_string()),
    };

    let mut stmt_q = conn
        .prepare(
            "SELECT id, battery_id, type, question, options, correct_index, expected_answer, explanation, tags, sort_order, created_at, updated_at, deleted_at
             FROM quiz_questions
             WHERE battery_id = ?1 AND deleted_at IS NULL
             ORDER BY sort_order ASC, created_at ASC",
        )
        .map_err(|e| e.to_string())?;
    let questions: Vec<QuizQuestionDto> = stmt_q
        .query_map(params![battery_id], map_question_row)
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    let all_latest = load_latest_attempts_conn(conn, None)?;
    let mut latest_attempts = HashMap::new();
    for q in &questions {
        if let Some(att) = all_latest.get(&q.id) {
            latest_attempts.insert(q.id.clone(), att.clone());
        }
    }

    let mut page_id_set = HashSet::new();
    if let Some(ref pid) = battery.page_id {
        if !pid.trim().is_empty() {
            page_id_set.insert(pid.clone());
        }
    }
    let mut stmt_l = conn
        .prepare("SELECT page_id FROM quiz_page_links WHERE battery_id = ?1")
        .map_err(|e| e.to_string())?;
    for pid in stmt_l
        .query_map(params![battery_id], |row| row.get::<_, String>(0))
        .map_err(|e| e.to_string())?
        .flatten()
    {
        page_id_set.insert(pid);
    }

    let mut linked_pages = Vec::new();
    for pid in page_id_set {
        if let Ok((title, icon)) = conn.query_row(
            "SELECT title, icon FROM pages WHERE id = ?1 AND deleted_at IS NULL",
            params![pid],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?)),
        ) {
            linked_pages.push(LinkedPageInfo {
                id: pid,
                title,
                icon,
            });
        }
    }

    Ok(Some(BatteryWithQuestionsDto {
        id: battery.id,
        parent_id: battery.parent_id,
        page_id: battery.page_id,
        title: battery.title,
        description: battery.description,
        layout: battery.layout,
        tags: battery.tags,
        sort_order: battery.sort_order,
        created_at: battery.created_at,
        updated_at: battery.updated_at,
        deleted_at: battery.deleted_at,
        questions,
        latest_attempts,
        linked_pages,
    }))
}

#[tauri::command]
pub fn quiz_get_all_batteries_enriched(
    db_state: State<'_, DbState>,
) -> Result<Vec<BatteryWithQuestionsDto>, String> {
    let guard = db_state.lock_conn()?;
    let conn = guard.as_ref().ok_or("Database not initialized")?;

    let mut stmt_b = conn
        .prepare(
            "SELECT id, parent_id, page_id, title, description, layout, tags, sort_order, created_at, updated_at, deleted_at
             FROM quiz_batteries
             WHERE deleted_at IS NULL
             ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let batteries: Vec<QuizBatteryDto> = stmt_b
        .query_map([], map_battery_row)
        .map_err(|e| e.to_string())?
        .flatten()
        .collect();

    let mut stmt_q = conn
        .prepare(
            "SELECT id, battery_id, type, question, options, correct_index, expected_answer, explanation, tags, sort_order, created_at, updated_at, deleted_at
             FROM quiz_questions
             WHERE deleted_at IS NULL
             ORDER BY sort_order ASC, created_at ASC",
        )
        .map_err(|e| e.to_string())?;
    let mut questions_by_battery: HashMap<String, Vec<QuizQuestionDto>> = HashMap::new();
    for q in stmt_q
        .query_map([], map_question_row)
        .map_err(|e| e.to_string())?
        .flatten()
    {
        questions_by_battery
            .entry(q.battery_id.clone())
            .or_default()
            .push(q);
    }

    let latest_attempts = load_latest_attempts_conn(conn, None)?;

    let mut links_by_battery: HashMap<String, HashSet<String>> = HashMap::new();
    if let Ok(mut stmt_l) = conn.prepare("SELECT battery_id, page_id FROM quiz_page_links") {
        if let Ok(rows) =
            stmt_l.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))
        {
            for (bid, pid) in rows.flatten() {
                links_by_battery.entry(bid).or_default().insert(pid);
            }
        }
    }

    let mut page_map: HashMap<String, LinkedPageInfo> = HashMap::new();
    if let Ok(mut stmt_p) =
        conn.prepare("SELECT id, title, icon FROM pages WHERE deleted_at IS NULL")
    {
        if let Ok(rows) = stmt_p.query_map([], |row| {
            Ok(LinkedPageInfo {
                id: row.get(0)?,
                title: row.get(1)?,
                icon: row.get(2)?,
            })
        }) {
            for p in rows.flatten() {
                page_map.insert(p.id.clone(), p);
            }
        }
    }

    let mut result = Vec::with_capacity(batteries.len());
    for b in batteries {
        let qs = questions_by_battery.remove(&b.id).unwrap_or_default();
        let mut b_attempts: HashMap<String, QuizAttemptDto> = HashMap::new();
        for q in &qs {
            if let Some(att) = latest_attempts.get(&q.id) {
                b_attempts.insert(q.id.clone(), att.clone());
            }
        }

        let mut page_ids = HashSet::new();
        if let Some(ref pid) = b.page_id {
            if !pid.trim().is_empty() {
                page_ids.insert(pid.clone());
            }
        }
        if let Some(extra) = links_by_battery.get(&b.id) {
            for pid in extra {
                page_ids.insert(pid.clone());
            }
        }

        let mut linked_pages = Vec::new();
        for pid in page_ids {
            if let Some(info) = page_map.get(&pid) {
                linked_pages.push(info.clone());
            }
        }

        result.push(BatteryWithQuestionsDto {
            id: b.id,
            parent_id: b.parent_id,
            page_id: b.page_id,
            title: b.title,
            description: b.description,
            layout: b.layout,
            tags: b.tags,
            sort_order: b.sort_order,
            created_at: b.created_at,
            updated_at: b.updated_at,
            deleted_at: b.deleted_at,
            questions: qs,
            latest_attempts: b_attempts,
            linked_pages,
        });
    }

    Ok(result)
}

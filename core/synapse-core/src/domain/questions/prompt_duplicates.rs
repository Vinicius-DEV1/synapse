use crate::error::{Result, SynapseError};
use rusqlite::Transaction;

pub(super) fn ensure_question_prompt_is_unique(
    tx: &Transaction<'_>,
    battery_id: &str,
    question: &str,
) -> Result<()> {
    let candidate = normalize_question_prompt(question);
    let mut statement = tx.prepare(
        "SELECT question FROM quiz_questions WHERE battery_id = ? AND deleted_at IS NULL",
    )?;
    let existing = statement
        .query_map([battery_id], |row| row.get::<_, String>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    if existing
        .iter()
        .any(|prompt| normalize_question_prompt(prompt) == candidate)
    {
        return Err(SynapseError::Validation(
            "A question with the same wording already exists in this battery".into(),
        ));
    }
    Ok(())
}

fn normalize_question_prompt(question: &str) -> String {
    question
        .split_whitespace()
        .map(str::to_lowercase)
        .collect::<Vec<_>>()
        .join(" ")
}

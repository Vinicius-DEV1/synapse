use super::models::{
    QuizAiFeedback, QuizAnswerResult, QuizAttemptDetail, QuizOpenAnswerAttempt, QuizStats,
};
use super::{attempts, open_attempts, QuizRepository};
use crate::db::Database;
use crate::error::{Result, SynapseError};

impl QuizRepository {
    pub fn record_quiz_attempt(
        db: &Database,
        battery_id: &str,
        question_id: &str,
        selected_index: i32,
        is_correct: bool,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        attempts::record_quiz_attempt(&conn, battery_id, question_id, selected_index, is_correct)
    }

    pub fn record_quiz_attempt_conn(
        conn: &rusqlite::Connection,
        battery_id: &str,
        question_id: &str,
        selected_index: i32,
        is_correct: bool,
    ) -> Result<bool> {
        attempts::record_quiz_attempt(conn, battery_id, question_id, selected_index, is_correct)
    }

    pub fn submit_quiz_answer(
        db: &Database,
        battery_id: &str,
        question_id: &str,
        selected_index: i32,
    ) -> Result<QuizAnswerResult> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        attempts::submit_quiz_answer(&conn, battery_id, question_id, selected_index)
    }

    pub fn submit_quiz_answer_conn(
        conn: &rusqlite::Connection,
        battery_id: &str,
        question_id: &str,
        selected_index: i32,
    ) -> Result<QuizAnswerResult> {
        attempts::submit_quiz_answer(conn, battery_id, question_id, selected_index)
    }

    pub fn get_quiz_stats(db: &Database) -> Result<QuizStats> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        attempts::get_quiz_stats(&conn)
    }

    pub fn get_quiz_stats_conn(conn: &rusqlite::Connection) -> Result<QuizStats> {
        attempts::get_quiz_stats(conn)
    }

    pub fn get_quiz_attempt_history(
        db: &Database,
        battery_id: Option<&str>,
        question_id: Option<&str>,
        limit: i32,
    ) -> Result<Vec<QuizAttemptDetail>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        attempts::get_quiz_attempt_history(&conn, battery_id, question_id, limit)
    }

    pub fn get_quiz_attempt_history_conn(
        conn: &rusqlite::Connection,
        battery_id: Option<&str>,
        question_id: Option<&str>,
        limit: i32,
    ) -> Result<Vec<QuizAttemptDetail>> {
        attempts::get_quiz_attempt_history(conn, battery_id, question_id, limit)
    }

    pub fn record_open_answer_attempt(
        db: &Database,
        battery_id: &str,
        question_id: &str,
        user_typed_answer: &str,
        feedback: QuizAiFeedback,
    ) -> Result<QuizOpenAnswerAttempt> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        open_attempts::record_open_answer_attempt(
            &conn,
            battery_id,
            question_id,
            user_typed_answer,
            feedback,
        )
    }

    pub fn record_open_answer_attempt_conn(
        conn: &rusqlite::Connection,
        battery_id: &str,
        question_id: &str,
        user_typed_answer: &str,
        feedback: QuizAiFeedback,
    ) -> Result<QuizOpenAnswerAttempt> {
        open_attempts::record_open_answer_attempt(
            conn,
            battery_id,
            question_id,
            user_typed_answer,
            feedback,
        )
    }

    pub fn get_latest_quiz_attempts(
        db: &Database,
        battery_id: Option<&str>,
        question_id: Option<&str>,
    ) -> Result<Vec<QuizAttemptDetail>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        open_attempts::get_latest_quiz_attempts(&conn, battery_id, question_id)
    }

    pub fn get_latest_quiz_attempts_conn(
        conn: &rusqlite::Connection,
        battery_id: Option<&str>,
        question_id: Option<&str>,
    ) -> Result<Vec<QuizAttemptDetail>> {
        open_attempts::get_latest_quiz_attempts(conn, battery_id, question_id)
    }
}

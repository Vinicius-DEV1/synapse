pub mod attempts;
pub mod authoring;
pub mod batteries;
pub mod models;
pub mod questions;
mod repository_attempts;

#[cfg(test)]
mod tests;

pub use attempts::*;
pub use authoring::*;
pub use batteries::*;
pub use models::*;
pub use questions::*;

use crate::db::Database;
use crate::error::{Result, SynapseError};

pub struct QuizRepository;

impl QuizRepository {
    // --- Batteries ---
    pub fn get_quiz_batteries(db: &Database) -> Result<Vec<QuizBattery>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        batteries::get_quiz_batteries(&conn)
    }

    pub fn get_quiz_batteries_conn(conn: &rusqlite::Connection) -> Result<Vec<QuizBattery>> {
        batteries::get_quiz_batteries(conn)
    }

    pub fn create_quiz_battery(
        db: &Database,
        title: &str,
        description: Option<&str>,
    ) -> Result<String> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        batteries::create_quiz_battery(&conn, title, description)
    }

    pub fn create_quiz_battery_conn(
        conn: &rusqlite::Connection,
        title: &str,
        description: Option<&str>,
    ) -> Result<String> {
        batteries::create_quiz_battery(conn, title, description)
    }

    pub fn update_quiz_battery(
        db: &Database,
        battery_id: &str,
        title: &str,
        description: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        batteries::update_quiz_battery(&conn, battery_id, title, description)
    }

    pub fn update_quiz_battery_conn(
        conn: &rusqlite::Connection,
        battery_id: &str,
        title: &str,
        description: Option<&str>,
    ) -> Result<bool> {
        batteries::update_quiz_battery(conn, battery_id, title, description)
    }

    pub fn delete_quiz_battery(db: &Database, battery_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        batteries::delete_quiz_battery(&conn, battery_id)
    }

    pub fn delete_quiz_battery_conn(conn: &rusqlite::Connection, battery_id: &str) -> Result<bool> {
        batteries::delete_quiz_battery(conn, battery_id)
    }

    // --- Questions ---
    pub fn get_battery_questions(db: &Database, battery_id: &str) -> Result<Vec<QuizQuestion>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        questions::get_battery_questions(&conn, battery_id)
    }

    pub fn get_battery_questions_conn(
        conn: &rusqlite::Connection,
        battery_id: &str,
    ) -> Result<Vec<QuizQuestion>> {
        questions::get_battery_questions(conn, battery_id)
    }

    pub fn get_all_quiz_questions(db: &Database) -> Result<Vec<QuizQuestion>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        questions::get_all_quiz_questions(&conn)
    }

    pub fn get_all_quiz_questions_conn(conn: &rusqlite::Connection) -> Result<Vec<QuizQuestion>> {
        questions::get_all_quiz_questions(conn)
    }

    pub fn get_all_quiz_tags(db: &Database) -> Result<Vec<String>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        questions::get_all_quiz_tags(&conn)
    }

    pub fn get_all_quiz_tags_conn(conn: &rusqlite::Connection) -> Result<Vec<String>> {
        questions::get_all_quiz_tags(conn)
    }

    pub fn get_error_notebook_questions(db: &Database) -> Result<Vec<QuizQuestion>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        questions::get_error_notebook_questions(&conn)
    }

    pub fn get_error_notebook_questions_conn(
        conn: &rusqlite::Connection,
    ) -> Result<Vec<QuizQuestion>> {
        questions::get_error_notebook_questions(conn)
    }

    pub fn get_random_simulation_questions(db: &Database, limit: i32) -> Result<Vec<QuizQuestion>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        questions::get_random_simulation_questions(&conn, limit)
    }

    pub fn get_random_simulation_questions_conn(
        conn: &rusqlite::Connection,
        limit: i32,
    ) -> Result<Vec<QuizQuestion>> {
        questions::get_random_simulation_questions(conn, limit)
    }

    pub fn get_filtered_quiz_questions(
        db: &Database,
        tags_json: Option<&str>,
        status: Option<&str>,
        limit: i32,
        shuffle: bool,
    ) -> Result<Vec<QuizQuestion>> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        questions::get_filtered_quiz_questions(&conn, tags_json, status, limit, shuffle)
    }

    pub fn get_filtered_quiz_questions_conn(
        conn: &rusqlite::Connection,
        tags_json: Option<&str>,
        status: Option<&str>,
        limit: i32,
        shuffle: bool,
    ) -> Result<Vec<QuizQuestion>> {
        questions::get_filtered_quiz_questions(conn, tags_json, status, limit, shuffle)
    }

    pub fn create_quiz_question(
        db: &Database,
        battery_id: &str,
        question: &str,
        options_json: &str,
        correct_index: i32,
        explanation: Option<&str>,
        tags_json: Option<&str>,
    ) -> Result<String> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        authoring::create_quiz_question(
            &conn,
            battery_id,
            question,
            options_json,
            correct_index,
            explanation,
            tags_json,
        )
    }

    pub fn create_quiz_question_conn(
        conn: &rusqlite::Connection,
        battery_id: &str,
        question: &str,
        options_json: &str,
        correct_index: i32,
        explanation: Option<&str>,
        tags_json: Option<&str>,
    ) -> Result<String> {
        authoring::create_quiz_question(
            conn,
            battery_id,
            question,
            options_json,
            correct_index,
            explanation,
            tags_json,
        )
    }

    pub fn update_quiz_question(
        db: &Database,
        question_id: &str,
        question: &str,
        options_json: &str,
        correct_index: i32,
        explanation: Option<&str>,
        tags_json: Option<&str>,
    ) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        authoring::update_quiz_question(
            &conn,
            question_id,
            question,
            options_json,
            correct_index,
            explanation,
            tags_json,
        )
    }

    pub fn update_quiz_question_conn(
        conn: &rusqlite::Connection,
        question_id: &str,
        question: &str,
        options_json: &str,
        correct_index: i32,
        explanation: Option<&str>,
        tags_json: Option<&str>,
    ) -> Result<bool> {
        authoring::update_quiz_question(
            conn,
            question_id,
            question,
            options_json,
            correct_index,
            explanation,
            tags_json,
        )
    }

    pub fn delete_quiz_question(db: &Database, question_id: &str) -> Result<bool> {
        let conn = db.lock().map_err(SynapseError::Database)?;
        authoring::delete_quiz_question(&conn, question_id)
    }

    pub fn delete_quiz_question_conn(
        conn: &rusqlite::Connection,
        question_id: &str,
    ) -> Result<bool> {
        authoring::delete_quiz_question(conn, question_id)
    }
}

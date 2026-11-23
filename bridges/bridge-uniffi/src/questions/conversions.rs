use super::models::{QuizAnswerRecord, QuizBatteryRecord, QuizQuestionRecord, QuizStatsRecord};
use synapse_core::domain::questions::{QuizAnswerResult, QuizBattery, QuizQuestion, QuizStats};

impl From<QuizBattery> for QuizBatteryRecord {
    fn from(value: QuizBattery) -> Self {
        Self {
            id: value.id,
            title: value.title,
            description: value.description,
            question_count: value.question_count,
        }
    }
}

impl From<QuizQuestion> for QuizQuestionRecord {
    fn from(value: QuizQuestion) -> Self {
        Self {
            id: value.id,
            battery_id: value.battery_id,
            type_: value.type_,
            question: value.question,
            options: value.options,
            correct_index: value.correct_index,
            expected_answer: value.expected_answer,
            explanation: value.explanation,
            tags: value.tags,
            sort_order: value.sort_order,
        }
    }
}

impl From<QuizAnswerResult> for QuizAnswerRecord {
    fn from(value: QuizAnswerResult) -> Self {
        Self {
            attempt_id: value.attempt_id,
            is_correct: value.is_correct,
            correct_index: value.correct_index,
            correct_answer: value.correct_answer,
            explanation: value.explanation,
        }
    }
}

impl From<QuizStats> for QuizStatsRecord {
    fn from(value: QuizStats) -> Self {
        Self {
            total_batteries: value.total_batteries,
            total_questions: value.total_questions,
            total_attempts: value.total_attempts,
            answered_questions: value.answered_questions,
            correct_attempts: value.correct_attempts,
            incorrect_attempts: value.incorrect_attempts,
            incorrect_questions: value.incorrect_questions,
            reviewable_incorrect_questions: value.reviewable_incorrect_questions,
            accuracy_rate: value.accuracy_rate,
        }
    }
}

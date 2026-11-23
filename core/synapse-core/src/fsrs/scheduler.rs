use super::algorithm::MemoryState;
use super::models::{Card, FsrsEngine, Rating, State};
use chrono::{DateTime, Duration, Utc};

#[derive(Clone, Copy)]
struct LearningStep {
    minutes: i64,
    next_step: i32,
}

impl FsrsEngine {
    pub fn review(&self, card: &Card, rating: Rating, now: DateTime<Utc>) -> Card {
        let elapsed_days = card
            .last_review
            .map(|last_review| (now.date_naive() - last_review.date_naive()).num_days())
            .unwrap_or_default()
            .clamp(0, i32::MAX as i64) as i32;
        let mut reviewed = card.clone();
        reviewed.elapsed_days = elapsed_days;
        reviewed.last_review = Some(now);
        reviewed.reps = reviewed.reps.saturating_add(1);

        match card.state {
            State::New => self.schedule_learning(reviewed, rating, now, State::Learning),
            State::Learning | State::Relearning => {
                self.schedule_learning(reviewed, rating, now, card.state)
            }
            State::Review => self.schedule_review(reviewed, rating, now),
        }
    }

    pub fn preview(&self, card: &Card, now: DateTime<Utc>) -> [Card; 4] {
        [Rating::Again, Rating::Hard, Rating::Good, Rating::Easy]
            .map(|rating| self.review(card, rating, now))
    }

    fn schedule_learning(
        &self,
        mut card: Card,
        rating: Rating,
        now: DateTime<Utc>,
        learning_state: State,
    ) -> Card {
        let next = self.next_memory(memory_state(&card), card.elapsed_days, rating);
        card.stability = next.stability;
        card.difficulty = next.difficulty;
        let steps = if learning_state == State::Relearning {
            &self.params.relearning_steps
        } else {
            &self.params.learning_steps
        };
        if let Some(step) = learning_step(steps, card.learning_steps, rating) {
            return apply_step(self, card, now, step, learning_state);
        }
        card.learning_steps = 0;
        card.state = State::Review;
        let interval = self.next_interval(card.stability);
        card.scheduled_days = interval;
        card.due = now + Duration::days(interval as i64);
        card
    }

    fn schedule_review(&self, mut card: Card, rating: Rating, now: DateTime<Utc>) -> Card {
        let again_memory = self.next_memory(memory_state(&card), card.elapsed_days, Rating::Again);
        let hard_memory = self.next_memory(memory_state(&card), card.elapsed_days, Rating::Hard);
        let good_memory = self.next_memory(memory_state(&card), card.elapsed_days, Rating::Good);
        let easy_memory = self.next_memory(memory_state(&card), card.elapsed_days, Rating::Easy);

        let mut hard_interval = self.next_interval(hard_memory.stability);
        let mut good_interval = self.next_interval(good_memory.stability);
        hard_interval = hard_interval.min(good_interval);
        good_interval = good_interval.max(hard_interval.saturating_add(1));
        let easy_interval = self
            .next_interval(easy_memory.stability)
            .max(good_interval.saturating_add(1));

        if rating == Rating::Again {
            card.stability = again_memory.stability;
            card.difficulty = again_memory.difficulty;
            card.lapses = card.lapses.saturating_add(1);
            if let Some(step) = learning_step(
                &self.params.relearning_steps,
                card.learning_steps,
                Rating::Again,
            ) {
                return apply_step(self, card, now, step, State::Relearning);
            }
            card.learning_steps = 0;
            card.state = State::Review;
            card.scheduled_days = self.next_interval(card.stability);
            card.due = now + Duration::days(card.scheduled_days as i64);
            return card;
        }

        let (memory, interval) = match rating {
            Rating::Hard => (hard_memory, hard_interval),
            Rating::Good => (good_memory, good_interval),
            Rating::Easy => (easy_memory, easy_interval),
            Rating::Again | Rating::Manual => (again_memory, hard_interval),
        };
        card.stability = memory.stability;
        card.difficulty = memory.difficulty;
        card.learning_steps = 0;
        card.state = State::Review;
        card.scheduled_days = interval;
        card.due = now + Duration::days(interval as i64);
        card
    }
}

fn memory_state(card: &Card) -> MemoryState {
    MemoryState {
        stability: card.stability,
        difficulty: card.difficulty,
    }
}

fn learning_step(steps: &[String], current_step: i32, rating: Rating) -> Option<LearningStep> {
    if steps.is_empty() {
        return None;
    }
    let step_index = current_step.max(0) as usize;
    if step_index >= steps.len() {
        return None;
    }
    let first = step_minutes(&steps[0])?;
    match rating {
        Rating::Again => Some(LearningStep {
            minutes: first,
            next_step: 0,
        }),
        Rating::Hard => {
            let minutes = if let Some(second) = steps.get(1).and_then(|step| step_minutes(step)) {
                ((first + second) as f64 / 2.0).round() as i64
            } else {
                (first as f64 * 1.5).round() as i64
            };
            Some(LearningStep {
                minutes,
                next_step: current_step.max(0),
            })
        }
        Rating::Good => steps.get(step_index + 1).and_then(|next| {
            step_minutes(next).map(|minutes| LearningStep {
                minutes,
                next_step: current_step.saturating_add(1),
            })
        }),
        Rating::Easy | Rating::Manual => None,
    }
}

fn step_minutes(step: &str) -> Option<i64> {
    let step = step.trim().to_ascii_lowercase();
    let (amount, unit) = match step.chars().last()? {
        'm' | 'h' | 'd' => (&step[..step.len() - 1], step.chars().last()?),
        _ => (step.as_str(), 'm'),
    };
    let amount = amount.parse::<i64>().ok()?;
    if amount < 0 {
        return None;
    }
    Some(match unit {
        'h' => amount.saturating_mul(60),
        'd' => amount.saturating_mul(1440),
        _ => amount,
    })
}

fn apply_step(
    engine: &FsrsEngine,
    mut card: Card,
    now: DateTime<Utc>,
    step: LearningStep,
    learning_state: State,
) -> Card {
    if step.minutes > 0 && step.minutes < 1440 {
        card.learning_steps = step.next_step;
        card.scheduled_days = 0;
        card.state = learning_state;
        card.due = now + Duration::minutes(step.minutes);
    } else if step.minutes >= 1440 {
        card.learning_steps = step.next_step;
        card.scheduled_days = (step.minutes / 1440) as i32;
        card.state = State::Review;
        card.due = now + Duration::minutes(step.minutes);
    } else {
        card.learning_steps = 0;
        card.state = State::Review;
        card.scheduled_days = engine.next_interval(card.stability);
        card.due = now + Duration::days(card.scheduled_days as i64);
    }
    card
}

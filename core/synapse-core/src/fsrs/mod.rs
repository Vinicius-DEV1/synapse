use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum State {
    New = 0,
    Learning = 1,
    Review = 2,
    Relearning = 3,
}

impl Default for State {
    fn default() -> Self {
        State::New
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[repr(u8)]
pub enum Rating {
    Manual = 0,
    Again = 1,
    Hard = 2,
    Good = 3,
    Easy = 4,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub stability: f64,
    pub difficulty: f64,
    pub elapsed_days: i32,
    pub scheduled_days: i32,
    pub reps: i32,
    pub lapses: i32,
    pub state: State,
    pub due: DateTime<Utc>,
    pub last_review: Option<DateTime<Utc>>,
}

impl Default for Card {
    fn default() -> Self {
        Self {
            stability: 0.0,
            difficulty: 0.0,
            elapsed_days: 0,
            scheduled_days: 0,
            reps: 0,
            lapses: 0,
            state: State::New,
            due: Utc::now(),
            last_review: None,
        }
    }
}

pub const DEFAULT_WEIGHTS: [f64; 17] = [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925,
    1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898,
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsrsParameters {
    pub request_retention: f64,
    pub maximum_interval: i32,
    pub weights: [f64; 17],
}

impl Default for FsrsParameters {
    fn default() -> Self {
        Self {
            request_retention: 0.9,
            maximum_interval: 36500,
            weights: DEFAULT_WEIGHTS,
        }
    }
}

pub struct FsrsEngine {
    pub params: FsrsParameters,
}

impl FsrsEngine {
    pub fn new(params: Option<FsrsParameters>) -> Self {
        Self {
            params: params.unwrap_or_default(),
        }
    }

    /// Calculates initial stability S0(G) where G is rating 1..=4
    fn init_stability(&self, rating: Rating) -> f64 {
        let idx = match rating {
            Rating::Again => 0,
            Rating::Hard => 1,
            Rating::Good => 2,
            Rating::Easy => 3,
            Rating::Manual => 2,
        };
        self.params.weights[idx].max(0.1)
    }

    /// Calculates initial difficulty D0(G)
    fn init_difficulty(&self, rating: Rating) -> f64 {
        let g = rating as u8 as f64;
        let w = &self.params.weights;
        let d = w[4] - (g - 3.0) * w[5];
        d.clamp(1.0, 10.0)
    }

    /// Next difficulty after review
    fn next_difficulty(&self, d: f64, rating: Rating) -> f64 {
        let g = rating as u8 as f64;
        let w = &self.params.weights;
        let next_d = d - w[6] * (g - 3.0);
        let mean_reversion = w[7] * self.init_difficulty(Rating::Good) + (1.0 - w[7]) * next_d;
        mean_reversion.clamp(1.0, 10.0)
    }

    /// Retrievability R(t, S)
    pub fn retrievability(&self, elapsed_days: f64, stability: f64) -> f64 {
        if stability <= 0.0 {
            return 0.0;
        }
        (1.0 + 19.0 / 81.0 * (elapsed_days / stability)).powf(-0.5)
    }

    /// Calculates next review interval from stability
    pub fn next_interval(&self, stability: f64) -> i32 {
        let interval = (stability / (19.0 / 81.0)
            * (self.params.request_retention.powf(-2.0) - 1.0))
            .round() as i32;
        interval.clamp(1, self.params.maximum_interval)
    }

    /// Executes a card review, returning the updated card state
    pub fn review(&self, card: &Card, rating: Rating, now: DateTime<Utc>) -> Card {
        let mut updated = card.clone();
        let elapsed = if let Some(last) = card.last_review {
            let days = (now - last).num_days() as i32;
            days.max(0)
        } else {
            0
        };

        updated.elapsed_days = elapsed;
        updated.last_review = Some(now);
        updated.reps += 1;

        match card.state {
            State::New => {
                updated.stability = self.init_stability(rating);
                updated.difficulty = self.init_difficulty(rating);
                if rating == Rating::Again {
                    updated.state = State::Learning;
                    updated.scheduled_days = 0;
                    updated.due = now + Duration::minutes(5);
                    updated.lapses += 1;
                } else {
                    updated.state = State::Review;
                    let interval = self.next_interval(updated.stability);
                    updated.scheduled_days = interval;
                    updated.due = now + Duration::days(interval as i64);
                }
            }
            State::Learning | State::Relearning => {
                if rating == Rating::Again {
                    updated.due = now + Duration::minutes(5);
                    updated.scheduled_days = 0;
                    updated.lapses += 1;
                } else {
                    updated.state = State::Review;
                    let interval = self.next_interval(updated.stability);
                    updated.scheduled_days = interval;
                    updated.due = now + Duration::days(interval as i64);
                }
            }
            State::Review => {
                let w = &self.params.weights;
                let r = self.retrievability(elapsed as f64, card.stability);
                let next_d = self.next_difficulty(card.difficulty, rating);

                if rating == Rating::Again {
                    updated.state = State::Relearning;
                    updated.lapses += 1;
                    // Lapse stability formula
                    let next_s = w[11]
                        * next_d.powf(-w[12])
                        * ((card.stability + 1.0).powf(w[13]) - 1.0)
                        * ((1.0 - r) * w[14]).exp();
                    updated.stability = next_s.max(0.1);
                    updated.difficulty = next_d;
                    updated.scheduled_days = 0;
                    updated.due = now + Duration::minutes(5);
                } else {
                    // Success stability formula
                    let hard_penalty = if rating == Rating::Hard { w[15] } else { 1.0 };
                    let easy_bonus = if rating == Rating::Easy { w[16] } else { 1.0 };
                    let next_s = card.stability
                        * (1.0
                            + w[8].exp()
                                * (11.0 - next_d)
                                * card.stability.powf(-w[9])
                                * (((1.0 - r) * w[10]).exp() - 1.0)
                                * hard_penalty
                                * easy_bonus);
                    updated.stability = next_s.max(0.1);
                    updated.difficulty = next_d;
                    let interval = self.next_interval(updated.stability);
                    updated.scheduled_days = interval;
                    updated.due = now + Duration::days(interval as i64);
                }
            }
        }

        updated
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fsrs_initial_review_good() {
        let engine = FsrsEngine::new(None);
        let card = Card::default();
        let now = Utc::now();

        let updated = engine.review(&card, Rating::Good, now);
        assert_eq!(updated.state, State::Review);
        assert!(updated.stability > 0.0);
        assert!(updated.difficulty >= 1.0 && updated.difficulty <= 10.0);
        assert!(updated.scheduled_days >= 1);
        assert_eq!(updated.reps, 1);
        assert_eq!(updated.lapses, 0);
    }

    #[test]
    fn test_fsrs_initial_review_again() {
        let engine = FsrsEngine::new(None);
        let card = Card::default();
        let now = Utc::now();

        let updated = engine.review(&card, Rating::Again, now);
        assert_eq!(updated.state, State::Learning);
        assert_eq!(updated.lapses, 1);
        assert_eq!(updated.scheduled_days, 0);
    }

    #[test]
    fn test_fsrs_review_progression() {
        let engine = FsrsEngine::new(None);
        let card = Card::default();
        let day0 = Utc::now();

        // Day 0: First review Good
        let card1 = engine.review(&card, Rating::Good, day0);
        assert!(card1.scheduled_days >= 1);

        // Advance days
        let day3 = day0 + Duration::days(card1.scheduled_days as i64);
        let card2 = engine.review(&card1, Rating::Good, day3);

        assert!(card2.stability > card1.stability);
        assert!(card2.scheduled_days > card1.scheduled_days);
        assert_eq!(card2.reps, 2);
    }
}

use super::models::{FsrsEngine, Rating};
use super::parameters::round_to;

const S_MIN: f64 = 0.001;
const S_MAX: f64 = 36500.0;

#[derive(Clone, Copy)]
pub(super) struct MemoryState {
    pub stability: f64,
    pub difficulty: f64,
}

impl FsrsEngine {
    pub fn retrievability(&self, elapsed_days: f64, stability: f64) -> f64 {
        if stability <= 0.0 {
            return 0.0;
        }
        let (_, factor) = self.decay_factor();
        round_to(
            (1.0 + factor * elapsed_days / stability).powf(-self.params.weights[20]),
            8,
        )
    }

    pub fn next_interval(&self, stability: f64) -> i32 {
        let modifier = self.interval_modifier();
        ((stability * modifier).round() as i32).clamp(1, self.params.maximum_interval)
    }

    pub(super) fn next_memory(
        &self,
        memory: MemoryState,
        elapsed_days: i32,
        rating: Rating,
    ) -> MemoryState {
        let (difficulty, stability) = (memory.difficulty, memory.stability);
        if difficulty == 0.0 && stability == 0.0 {
            return MemoryState {
                difficulty: self.init_difficulty(rating).clamp(1.0, 10.0),
                stability: self.init_stability(rating),
            };
        }
        if rating == Rating::Manual {
            return memory;
        }

        let weights = &self.params.weights;
        let retrievability = self.retrievability(elapsed_days as f64, stability);
        let next_stability = if elapsed_days == 0 && self.params.enable_short_term {
            self.next_short_term_stability(stability, rating)
        } else if rating == Rating::Again {
            let failed = self.next_forget_stability(difficulty, stability, retrievability);
            let mut minimum = stability;
            if self.params.enable_short_term {
                minimum /= (weights[17] * weights[18]).exp();
            }
            round_to(minimum, 8).clamp(S_MIN, failed)
        } else {
            self.next_recall_stability(difficulty, stability, retrievability, rating)
        };
        let delta = -weights[6] * (rating as u8 as f64 - 3.0);
        let damped = round_to(delta * (10.0 - difficulty) / 9.0, 8);
        let next_difficulty = difficulty + damped;
        let initial_easy = self.init_difficulty(Rating::Easy);
        let reverted = round_to(
            weights[7] * initial_easy + (1.0 - weights[7]) * next_difficulty,
            8,
        );
        MemoryState {
            stability: next_stability,
            difficulty: reverted.clamp(1.0, 10.0),
        }
    }

    fn init_stability(&self, rating: Rating) -> f64 {
        let index = match rating {
            Rating::Again => 0,
            Rating::Hard => 1,
            Rating::Good | Rating::Manual => 2,
            Rating::Easy => 3,
        };
        self.params.weights[index].max(0.1)
    }

    fn init_difficulty(&self, rating: Rating) -> f64 {
        let grade = rating as u8 as f64;
        let weights = &self.params.weights;
        round_to(weights[4] - ((grade - 1.0) * weights[5]).exp() + 1.0, 8)
    }

    fn next_short_term_stability(&self, stability: f64, rating: Rating) -> f64 {
        let weights = &self.params.weights;
        let grade = rating as u8 as f64;
        let sinc = stability.powf(-weights[19]) * (weights[17] * (grade - 3.0 + weights[18])).exp();
        let adjusted = if rating as u8 >= Rating::Hard as u8 {
            sinc.max(1.0)
        } else {
            sinc
        };
        round_to((stability * adjusted).clamp(S_MIN, S_MAX), 8)
    }

    fn next_forget_stability(&self, difficulty: f64, stability: f64, retrievability: f64) -> f64 {
        let weights = &self.params.weights;
        let value = weights[11]
            * difficulty.powf(-weights[12])
            * ((stability + 1.0).powf(weights[13]) - 1.0)
            * ((1.0 - retrievability) * weights[14]).exp();
        round_to(value.clamp(S_MIN, S_MAX), 8)
    }

    fn next_recall_stability(
        &self,
        difficulty: f64,
        stability: f64,
        retrievability: f64,
        rating: Rating,
    ) -> f64 {
        let weights = &self.params.weights;
        let hard_penalty = if rating == Rating::Hard {
            weights[15]
        } else {
            1.0
        };
        let easy_bonus = if rating == Rating::Easy {
            weights[16]
        } else {
            1.0
        };
        let value = stability
            * (1.0
                + weights[8].exp()
                    * (11.0 - difficulty)
                    * stability.powf(-weights[9])
                    * (((1.0 - retrievability) * weights[10]).exp() - 1.0)
                    * hard_penalty
                    * easy_bonus);
        round_to(value.clamp(S_MIN, S_MAX), 8)
    }

    fn decay_factor(&self) -> (f64, f64) {
        let decay = -self.params.weights[20];
        let factor = round_to(((0.9_f64.ln()) / decay).exp() - 1.0, 8);
        (decay, factor)
    }

    fn interval_modifier(&self) -> f64 {
        let (decay, factor) = self.decay_factor();
        round_to(
            (self.params.request_retention.powf(1.0 / decay) - 1.0) / factor,
            8,
        )
    }
}

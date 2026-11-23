use super::models::{FsrsParameters, DEFAULT_WEIGHTS};

const CLAMPS: [(f64, f64); 21] = [
    (0.001, 100.0),
    (0.001, 100.0),
    (0.001, 100.0),
    (0.001, 100.0),
    (1.0, 10.0),
    (0.001, 4.0),
    (0.001, 4.0),
    (0.001, 0.75),
    (0.0, 4.5),
    (0.0, 0.8),
    (0.001, 3.5),
    (0.001, 5.0),
    (0.001, 0.25),
    (0.001, 0.9),
    (0.0, 4.0),
    (0.0, 1.0),
    (1.0, 6.0),
    (0.0, 2.0),
    (0.0, 2.0),
    (0.01, 0.8),
    (0.1, 0.8),
];

impl FsrsParameters {
    pub(super) fn normalize(&mut self) {
        if !(0.0 < self.request_retention && self.request_retention <= 1.0) {
            log::warn!("Invalid FSRS request retention; using 0.9");
            self.request_retention = 0.9;
        }
        self.maximum_interval = self.maximum_interval.clamp(1, 36500);
        if !matches!(self.weights.len(), 17 | 19 | 21)
            || self.weights.iter().any(|weight| !weight.is_finite())
        {
            log::warn!("Invalid FSRS weight vector; using the application defaults");
            self.weights = DEFAULT_WEIGHTS.to_vec();
        }
        self.learning_steps = normalize_steps(&self.learning_steps);
        self.relearning_steps = normalize_steps(&self.relearning_steps);
        self.weights = migrate_weights(
            &self.weights,
            self.relearning_steps.len(),
            self.enable_short_term,
        );
    }
}

pub(super) fn normalize_steps(steps: &[String]) -> Vec<String> {
    steps
        .iter()
        .map(|step| step.trim().to_ascii_lowercase())
        .filter(|step| !step.is_empty())
        .collect()
}

fn migrate_weights(weights: &[f64], relearning_steps: usize, enable_short_term: bool) -> Vec<f64> {
    let mut clipped = weights.to_vec();
    let mut clamps = CLAMPS;
    if !enable_short_term {
        clamps[19].0 = 0.0;
    }
    if relearning_steps > 1 && clipped.len() >= 19 {
        let w11 = clipped[11].clamp(clamps[11].0, clamps[11].1);
        let w13 = clipped[13].clamp(clamps[13].0, clamps[13].1);
        let w14 = clipped[14].clamp(clamps[14].0, clamps[14].1);
        let value =
            -(w11.ln() + (2.0_f64.powf(w13) - 1.0).ln() + w14 * 0.3) / relearning_steps as f64;
        let ceiling = value.max(0.0).sqrt().clamp(0.01, 2.0);
        clamps[17].1 = ceiling;
        clamps[18].1 = ceiling;
    }
    for (index, weight) in clipped.iter_mut().enumerate() {
        let (minimum, maximum) = clamps[index];
        *weight = weight.clamp(minimum, maximum);
    }

    match clipped.len() {
        21 => clipped,
        19 => {
            clipped.extend([0.0, 0.5]);
            clipped
        }
        17 => {
            clipped[4] = round_to(clipped[5] * 2.0 + clipped[4], 8);
            clipped[5] = round_to(((clipped[5] * 3.0 + 1.0).ln()) / 3.0, 8);
            clipped[6] = round_to(clipped[6] + 0.5, 8);
            clipped.extend([0.0, 0.0, 0.0, 0.5]);
            clipped
        }
        _ => unreachable!("FSRS weight length was validated before migration"),
    }
}

pub(super) fn round_to(value: f64, digits: i32) -> f64 {
    let factor = 10_f64.powi(digits);
    (value * factor).round() / factor
}

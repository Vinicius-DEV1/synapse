import { fsrs, generatorParameters, Rating, State } from 'ts-fsrs';
import type { Card, Grade } from 'ts-fsrs';
import type { AnkiDeckSettings, FSRSCardInput } from '../types/anki';

const defaultParams = generatorParameters({
  maximum_interval: 36500,
  request_retention: 0.9,
  w: [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
    0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898,
  ],
});

function safeNumber(val: unknown, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

export function parseStepMinutes(stepStr?: string | null, fallbackMinutes = 5): number {
  if (!stepStr || typeof stepStr !== 'string') return fallbackMinutes;
  const firstStep = stepStr.split(',')[0]?.trim();
  if (!firstStep) return fallbackMinutes;
  const match = firstStep.match(/^(\d+)(m|h|d)?$/i);
  if (!match) return fallbackMinutes;
  const val = parseInt(match[1], 10);
  if (!Number.isFinite(val) || val <= 0) return fallbackMinutes;
  const unit = (match[2] || 'm').toLowerCase();
  if (unit === 'h') return val * 60;
  if (unit === 'd') return val * 1440;
  return val;
}

export const getFSRS = (customWeights?: string | null) => {
  if (customWeights) {
    try {
      const weights = JSON.parse(customWeights);
      if (
        Array.isArray(weights) &&
        (weights.length === 17 || weights.length === 19 || weights.length === 21) &&
        weights.every((w) => typeof w === 'number' && Number.isFinite(w))
      ) {
        return fsrs(generatorParameters({ ...defaultParams, w: weights }));
      }
    } catch (err) {
      console.warn('Failed to parse FSRS weights, falling back to default:', err);
    }
  }
  return fsrs(defaultParams);
};

export const migrateCardToFSRS = (card: FSRSCardInput): Card => {
  const stability = safeNumber(card.stability, 0);
  const difficulty = safeNumber(card.difficulty, 0);
  const reps = safeNumber(card.reps, 0);
  const lapses = safeNumber(card.lapses, 0);
  const learningSteps = safeNumber(card.learning_steps, 0);
  const due = card.due_date ? new Date(card.due_date) : new Date();
  const lastReview = card.last_review ? new Date(card.last_review) : undefined;

  if (card.scheduled_days !== undefined && card.scheduled_days !== null) {
    return {
      due: isNaN(due.getTime()) ? new Date() : due,
      stability,
      difficulty,
      elapsed_days: safeNumber(card.elapsed_days, 0),
      scheduled_days: safeNumber(card.scheduled_days, 0),
      learning_steps: learningSteps,
      reps,
      lapses,
      state: parseState(card.state),
      last_review: lastReview && !isNaN(lastReview.getTime()) ? lastReview : undefined,
    };
  }

  const oldState = String(card.state ?? '0');
  let state = State.New;
  if (oldState === '1' || oldState.toLowerCase() === 'learning') state = State.Learning;
  else if (oldState === '2' || oldState.toLowerCase() === 'review') state = State.Review;
  else if (oldState === '3' || oldState.toLowerCase() === 'relearning') state = State.Relearning;

  if (stability > 0 && state === State.New) {
    state = State.Review;
  }

  return {
    due: isNaN(due.getTime()) ? new Date() : due,
    stability,
    difficulty,
    elapsed_days: 0,
    scheduled_days: Math.round(stability),
    learning_steps: learningSteps,
    reps,
    lapses,
    state,
    last_review: lastReview && !isNaN(lastReview.getTime()) ? lastReview : undefined,
  };
};

export function parseState(stateVal: unknown): State {
  if (typeof stateVal === 'number') {
    if (stateVal >= 0 && stateVal <= 3) return stateVal as State;
    return State.New;
  }
  switch (String(stateVal ?? '').toLowerCase()) {
    case '0':
    case 'new':
      return State.New;
    case '1':
    case 'learning':
      return State.Learning;
    case '2':
    case 'review':
      return State.Review;
    case '3':
    case 'relearning':
      return State.Relearning;
    default:
      return State.New;
  }
}

export const processReview = (
  card: FSRSCardInput,
  ratingNum: number,
  settings?: AnkiDeckSettings | null
): Card => {
  const f = getFSRS(settings?.fsrs_weights);
  const fsrsCard = migrateCardToFSRS(card);
  const now = new Date();

  let rating = Rating.Good;
  switch (ratingNum) {
    case 1:
      rating = Rating.Again;
      break;
    case 2:
      rating = Rating.Hard;
      break;
    case 3:
      rating = Rating.Good;
      break;
    case 4:
      rating = Rating.Easy;
      break;
  }

  // Guard against last_review in the future (prevent negative elapsed calculations)
  if (fsrsCard.last_review && fsrsCard.last_review.getTime() > now.getTime()) {
    fsrsCard.last_review = new Date(now.getTime());
  }

  const record = f.next(fsrsCard, now, rating);

  if (rating === Rating.Again && (record.card.state === State.Learning || record.card.state === State.Relearning)) {
    const isRelearning = record.card.state === State.Relearning;
    const stepsConfig = isRelearning ? settings?.relearning_steps : settings?.learning_steps;
    const stepMinutes = parseStepMinutes(stepsConfig, 5);
    record.card.due = new Date(now.getTime() + stepMinutes * 60000);
  }

  // Guard against due date scheduled in the past or invalid NaN
  if (isNaN(record.card.due.getTime()) || record.card.due.getTime() < now.getTime()) {
    record.card.due = new Date(now.getTime() + 60000);
  }

  // Guard against NaN or invalid intervals and FSRS metrics
  record.card.scheduled_days = Math.max(0, safeNumber(record.card.scheduled_days, 0));
  record.card.elapsed_days = Math.max(0, safeNumber(record.card.elapsed_days, 0));
  record.card.stability = Math.max(0.01, safeNumber(record.card.stability, 0.1));
  record.card.difficulty = Math.min(10, Math.max(1, safeNumber(record.card.difficulty, 5)));

  return record.card;
};

export const formatAnkiInterval = (diffMs: number): string => {
  if (!Number.isFinite(diffMs) || diffMs <= 0) return '<1m';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `<${Math.max(1, mins)}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round((days / 30) * 10) / 10;
  if (days < 365) return `${months}mo`;
  const years = Math.round((days / 365) * 10) / 10;
  return `${years}y`;
};

export const previewIntervals = (
  card: FSRSCardInput,
  settings?: AnkiDeckSettings | null
): string[] => {
  const f = getFSRS(settings?.fsrs_weights);
  const fsrsCard = migrateCardToFSRS(card);
  const now = new Date();

  const intervals: string[] = [];
  const ratings: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

  for (const rating of ratings) {
    const record = f.next(fsrsCard, now, rating);
    let due = record.card.due;

    if (rating === Rating.Again && (record.card.state === State.Learning || record.card.state === State.Relearning)) {
      const isRelearning = record.card.state === State.Relearning;
      const stepsConfig = isRelearning ? settings?.relearning_steps : settings?.learning_steps;
      const stepMinutes = parseStepMinutes(stepsConfig, 5);
      due = new Date(now.getTime() + stepMinutes * 60000);
    }

    const diff = isNaN(due.getTime()) ? 0 : Math.max(0, due.getTime() - now.getTime());
    intervals.push(formatAnkiInterval(diff));
  }

  return intervals;
};
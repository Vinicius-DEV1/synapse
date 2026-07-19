import { fsrs, FSRS, generatorParameters, Rating, State } from 'ts-fsrs';
import type { Card } from 'ts-fsrs';
import type { AnkiCard, AnkiDeckSettings } from '../types';

const defaultParams = generatorParameters({
  maximum_interval: 36500,
  request_retention: 0.9,
  w: [
    0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
    0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898,
  ],
});

export const getFSRS = (customWeights?: string) => {
  if (customWeights) {
    try {
      const weights = JSON.parse(customWeights);
      if (Array.isArray(weights) && weights.length === 17) {
        return fsrs(generatorParameters({ ...defaultParams, w: weights }));
      }
    } catch (e) {
      console.warn('Failed to parse FSRS weights, falling back to default');
    }
  }
  return fsrs(defaultParams);
};

export const migrateCardToFSRS = (card: any): Card => {
  if (card.scheduled_days !== undefined) {
    return {
      due: card.due_date ? new Date(card.due_date) : new Date(),
      stability: Number(card.stability) || 0,
      difficulty: Number(card.difficulty) || 0,
      elapsed_days: Number(card.elapsed_days) || 0,
      scheduled_days: Number(card.scheduled_days) || 0,
      reps: Number(card.reps) || 0,
      lapses: Number(card.lapses) || 0,
      state: parseState(card.state),
      last_review: card.last_review ? new Date(card.last_review) : undefined,
    };
  }

  const oldState = String(card.state || '0');
  const stability = Number(card.stability) || 0;
  
  let state = State.New;
  if (oldState === '1') state = State.Learning;
  if (oldState === '2') state = State.Review;
  if (oldState === '3') state = State.Relearning;
  
  if (stability > 0 && state === State.New) {
      state = State.Review;
  }

  return {
    due: card.due_date ? new Date(card.due_date) : new Date(),
    stability: stability,
    difficulty: Number(card.difficulty) || 0,
    elapsed_days: 0,
    scheduled_days: Math.round(stability),
    reps: Number(card.reps) || 0,
    lapses: Number(card.lapses) || 0,
    state,
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
};

export function parseState(stateStr: string | number): State {
  if (typeof stateStr === 'number') return stateStr as State;
  switch (String(stateStr).toLowerCase()) {
    case '0':
    case 'new': return State.New;
    case '1':
    case 'learning': return State.Learning;
    case '2':
    case 'review': return State.Review;
    case '3':
    case 'relearning': return State.Relearning;
    default: return State.New;
  }
}

export const processReview = (card: any, ratingNum: number, settings?: AnkiDeckSettings): Card => {
  const f = getFSRS(settings?.fsrs_weights || undefined);
  const fsrsCard = migrateCardToFSRS(card);
  const now = new Date();
  
  let rating = Rating.Good;
  switch (ratingNum) {
    case 1: rating = Rating.Again; break;
    case 2: rating = Rating.Hard; break;
    case 3: rating = Rating.Good; break;
    case 4: rating = Rating.Easy; break;
  }
  
  const record = f.next(fsrsCard, now, rating);
  
  if (rating === Rating.Again && (record.card.state === State.Learning || record.card.state === State.Relearning)) {
     record.card.due = new Date(now.getTime() + 5 * 60000); 
  }
  
  return record.card;
};
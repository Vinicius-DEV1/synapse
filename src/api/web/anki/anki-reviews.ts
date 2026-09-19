import { processReview, previewIntervals } from '../../../services/fsrs';
import { collectDescendantDeckIds } from './utils/deck-tree';
import { joinCardsWithNotes } from './utils/card-note-join';

export async function getReviews(db: any) {
  const all = (await db.getAll('anki_reviews')) || [];
  const reviews = all.filter((r: any) => !r.deleted_at);
  return { success: true, reviews };
}

export async function getDueCards(db: any, deckId: string) {
  const allDecks = (await db.getAll('anki_decks')) || [];
  const activeDecks = allDecks.filter((d: any) => !d.deleted_at);

  const deckIds = collectDescendantDeckIds(activeDecks, deckId);

  const allCards: any[] = (await db.getAll('anki_cards')) || [];
  const allNotes: any[] = (await db.getAll('anki_notes')) || [];

  const now = new Date().toISOString();
  const allSettings = (await db.getAll('anki_deck_settings')) || [];
  const deckSettings = allSettings.find((s: any) => s.deck_id === deckId) || {
    new_limit: 20,
    review_limit: 200,
  };

  const validCards = allCards.filter((c: any) => !c.deleted_at && deckIds.has(c.deck_id));
  const joinedCards = joinCardsWithNotes(validCards, allNotes);

  let newCards: any[] = [];
  let learningCards: any[] = [];
  let reviewCards: any[] = [];

  for (const c of joinedCards) {
    const state = Number(c.state) || 0;
    if (state === 0) {
      newCards.push(c);
    } else if (state === 1 || state === 3) {
      if (c.due_date && c.due_date <= now) {
        learningCards.push(c);
      }
    } else if (state === 2) {
      if (c.due_date && c.due_date <= now) {
        reviewCards.push(c);
      }
    }
  }

  newCards.sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );
  learningCards.sort(
    (a, b) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime()
  );
  reviewCards.sort(
    (a, b) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime()
  );

  newCards = newCards.slice(0, deckSettings.new_limit);
  reviewCards = reviewCards.slice(0, deckSettings.review_limit);

  return [...learningCards, ...reviewCards, ...newCards];
}

export async function reviewCard(
  db: any,
  generateId: () => string,
  cardId: string,
  rating: number
) {
  const card = await db.get('anki_cards', cardId);
  if (card) {
    const allSettings = (await db.getAll('anki_deck_settings')) || [];
    const deckSettings = allSettings.find((s: any) => s.deck_id === card.deck_id);

    const fsrsCardState = processReview(card, rating, deckSettings);

    const updated = {
      ...card,
      state: fsrsCardState.state,
      stability: fsrsCardState.stability,
      difficulty: fsrsCardState.difficulty,
      elapsed_days: fsrsCardState.elapsed_days,
      scheduled_days: fsrsCardState.scheduled_days,
      reps: fsrsCardState.reps,
      lapses: fsrsCardState.lapses,
      due_date: fsrsCardState.due.toISOString(),
      last_review: fsrsCardState.last_review?.toISOString() || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.put('anki_cards', updated);

    const review = {
      id: generateId(),
      card_id: cardId,
      rating,
      reviewed_at: new Date().toISOString(),
    };
    await db.put('anki_reviews', review);

    return { success: true };
  }
  return { success: false, error: 'Card not found' };
}

export async function getCardIntervals(db: any, cardId: string) {
  const card = await db.get('anki_cards', cardId);
  if (card) {
    const allSettings = (await db.getAll('anki_deck_settings')) || [];
    const deckSettings = allSettings.find((s: any) => s.deck_id === card.deck_id);

    const intervals = previewIntervals(card, deckSettings);
    return { success: true, intervals };
  }
  return { success: false, error: 'Card not found' };
}

export async function getTotalDueCount(db: any): Promise<number> {
  const allCards: any[] = (await db.getAll('anki_cards')) || [];
  const allSettings: any[] = (await db.getAll('anki_deck_settings')) || [];
  const settingsMap = new Map<string, { new_limit: number; review_limit: number }>();
  for (const s of allSettings) {
    if (s.deck_id) {
      settingsMap.set(s.deck_id, {
        new_limit: s.new_limit ?? 20,
        review_limit: s.review_limit ?? 200,
      });
    }
  }

  const now = new Date().toISOString();
  const deckCounts = new Map<string, { news: number; learning: number; review: number; new_limit: number; review_limit: number }>();

  for (const c of allCards) {
    if (c.deleted_at) continue;
    const deckId = c.deck_id;
    if (!deckId) continue;
    let entry = deckCounts.get(deckId);
    if (!entry) {
      const s = settingsMap.get(deckId) || { new_limit: 20, review_limit: 200 };
      entry = { news: 0, learning: 0, review: 0, new_limit: s.new_limit, review_limit: s.review_limit };
      deckCounts.set(deckId, entry);
    }

    const state = Number(c.state) || 0;
    if (state === 0) {
      entry.news++;
    } else if (state === 1 || state === 3) {
      if (c.due_date && c.due_date <= now) entry.learning++;
    } else if (state === 2) {
      if (c.due_date && c.due_date <= now) entry.review++;
    }
  }

  let total = 0;
  for (const entry of deckCounts.values()) {
    total += entry.learning + Math.min(entry.review, entry.review_limit) + Math.min(entry.news, entry.new_limit);
  }
  return total;
}

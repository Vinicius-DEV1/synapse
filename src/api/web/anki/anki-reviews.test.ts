import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../../services/db-web';
import { getDueCards, reviewCard, getReviews, getCardIntervals } from './anki-reviews';

describe('anki-reviews web repository', () => {
  let db: any;

  beforeEach(async () => {
    db = await getWebDb();
    await db.clear('anki_decks');
    await db.clear('anki_deck_settings');
    await db.clear('anki_notes');
    await db.clear('anki_cards');
    await db.clear('anki_reviews');
  });

  it('retrieves due cards for a deck including subdecks', async () => {
    // Setup parent deck and child deck
    await db.put('anki_decks', { id: 'parent_deck', name: 'English', parent_id: null });
    await db.put('anki_decks', { id: 'child_deck', name: 'Vocab', parent_id: 'parent_deck' });

    // Setup notes & cards
    await db.put('anki_notes', { id: 'note_1', deck_id: 'child_deck', front: 'Cat', back: 'Gato' });
    await db.put('anki_cards', {
      id: 'card_1',
      deck_id: 'child_deck',
      note_id: 'note_1',
      state: 0, // New
    });

    const due = await getDueCards(db, 'parent_deck');
    expect(due).toHaveLength(1);
    expect(due[0].front).toBe('Cat');
    expect(due[0].back).toBe('Gato');
  });

  it('records review and updates card with FSRS scheduled due date', async () => {
    await db.put('anki_decks', { id: 'deck_1', name: 'Test Deck', parent_id: null });
    await db.put('anki_notes', { id: 'n1', deck_id: 'deck_1', front: 'Hello', back: 'Olá' });
    await db.put('anki_cards', {
      id: 'c1',
      deck_id: 'deck_1',
      note_id: 'n1',
      state: 0,
      stability: 0,
      difficulty: 0,
    });

    const res = await reviewCard(db, () => 'rev_1', 'c1', 3); // Good rating
    expect(res.success).toBe(true);

    const reviews = await getReviews(db);
    expect(reviews.reviews).toHaveLength(1);
    expect(reviews.reviews[0].rating).toBe(3);

    const updatedCard = await db.get('anki_cards', 'c1');
    expect(updatedCard.reps).toBe(1);
    expect(updatedCard.due_date).toBeDefined();

    const intervals = await getCardIntervals(db, 'c1');
    expect(intervals.intervals).toHaveLength(4);
  });
});

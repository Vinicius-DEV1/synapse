import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../../services/db-web';
import { migrateToNotes } from './anki-migration';

describe('anki-migration web repository', () => {
  let db: any;

  beforeEach(async () => {
    db = await getWebDb();
    await db.clear('anki_decks');
    await db.clear('anki_deck_settings');
    await db.clear('anki_notes');
    await db.clear('anki_cards');
    await db.clear('anki_reviews');
  });

  it('migrates legacy cards to notes and is strictly idempotent on consecutive runs', async () => {
    // Setup legacy card with front/back directly on card record
    await db.put('anki_cards', {
      id: 'legacy_card_1',
      deck_id: 'deck_1',
      front: 'Legacy Question',
      back: 'Legacy Answer',
      card_type: 'reading',
      state: 0,
    });

    let idCounter = 1;
    const generateId = () => `id_${idCounter++}`;

    // First migration run
    const firstRun = await migrateToNotes(db, generateId);
    expect(firstRun.success).toBe(true);
    expect(firstRun.migratedCount).toBe(1);

    const notesAfterFirst = await db.getAll('anki_notes');
    expect(notesAfterFirst).toHaveLength(1);
    expect(notesAfterFirst[0].front).toBe('Legacy Question');

    const cardAfterFirst = await db.get('anki_cards', 'legacy_card_1');
    expect(cardAfterFirst.note_id).toBe('id_1');
    expect(cardAfterFirst.front).toBeUndefined();

    // Second migration run (idempotency check)
    const secondRun = await migrateToNotes(db, generateId);
    expect(secondRun.success).toBe(true);
    expect(secondRun.migratedCount).toBe(0);

    const notesAfterSecond = await db.getAll('anki_notes');
    expect(notesAfterSecond).toHaveLength(1); // No duplicates created
  });
});

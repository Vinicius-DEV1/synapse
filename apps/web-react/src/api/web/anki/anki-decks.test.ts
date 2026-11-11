import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../../services/db-web';
import { createDeck, getDecks, updateDeck, deleteDeck, resetDeckProgress } from './anki-decks';

describe('anki-decks web repository', () => {
  let db: any;

  beforeEach(async () => {
    db = await getWebDb();
    await db.clear('anki_decks');
    await db.clear('anki_deck_settings');
    await db.clear('anki_notes');
    await db.clear('anki_cards');
    await db.clear('anki_reviews');
  });

  it('creates deck and creates default deck settings automatically', async () => {
    const res = await createDeck(
      db,
      () => 'deck_1',
      'Japanese N5 Vocabulary',
      'Basic Japanese words'
    );
    expect(res.success).toBe(true);

    const decksRes = await getDecks(db);
    expect(decksRes.decks).toHaveLength(1);
    expect(decksRes.decks[0].name).toBe('Japanese N5 Vocabulary');

    const settings = await db.getAll('anki_deck_settings');
    expect(settings).toHaveLength(1);
    expect(settings[0].deck_id).toBe('deck_1');
    expect(settings[0].new_limit).toBe(20);
  });

  it('updates deck name and description', async () => {
    await createDeck(db, () => 'deck_2', 'Biology');
    await updateDeck(db, 'deck_2', 'Cellular Biology', 'Cells and mitosis');

    const decks = await getDecks(db);
    expect(decks.decks[0].name).toBe('Cellular Biology');
    expect(decks.decks[0].description).toBe('Cells and mitosis');
  });

  it('soft-deletes deck and all associated notes and cards', async () => {
    await createDeck(db, () => 'deck_del', 'To Delete');
    await db.put('anki_notes', { id: 'note_1', deck_id: 'deck_del', front: 'Q', back: 'A' });
    await db.put('anki_cards', { id: 'card_1', deck_id: 'deck_del', note_id: 'note_1' });

    const delRes = await deleteDeck(db, 'deck_del');
    expect(delRes.success).toBe(true);

    const decks = await getDecks(db);
    expect(decks.decks).toHaveLength(0);

    const note = await db.get('anki_notes', 'note_1');
    expect(note.deleted_at).toBeDefined();

    const card = await db.get('anki_cards', 'card_1');
    expect(card.deleted_at).toBeDefined();
  });
});

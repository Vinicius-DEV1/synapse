import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../../services/db-web-schema';
import type { AnkiDeckRecord } from '../../../types/anki';

export async function getDecks(db: IDBPDatabase<CadernoDBSchema>): Promise<{ success: boolean; decks: AnkiDeckRecord[] }> {
  const all = (await db.getAll('anki_decks')) || [];
  const decks = all
    .filter((d) => !d.deleted_at)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { success: true, decks };
}

export async function createDeck(
  db: IDBPDatabase<CadernoDBSchema>,
  generateId: () => string,
  name: string,
  description?: string,
  parentId?: string | null
): Promise<{ success: boolean; id: string }> {
  const now = new Date().toISOString();
  const deck = {
    id: generateId(),
    name,
    description: description || '',
    parent_id: parentId || null,
    created_at: now,
    updated_at: now,
  };
  await db.put('anki_decks', deck);

  const settings = {
    id: generateId(),
    deck_id: deck.id,
    new_limit: 20,
    review_limit: 200,
    learning_steps: '1m,10m',
    relearning_steps: '10m',
    fsrs_weights: null,
    created_at: now,
    updated_at: now,
  };
  await db.put('anki_deck_settings', settings);

  return { success: true, id: deck.id };
}

export async function updateDeck(
  db: IDBPDatabase<CadernoDBSchema>,
  deckId: string,
  name: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const existing = await db.get('anki_decks', deckId);
  if (existing) {
    const updated = { ...existing, name, description, updated_at: new Date().toISOString() };
    await db.put('anki_decks', updated);
    return { success: true };
  }
  return { success: false, error: 'Deck not found' };
}

export async function deleteDeck(
  db: IDBPDatabase<CadernoDBSchema>,
  deckId: string
): Promise<{ success: boolean; error?: string }> {
  const deck = await db.get('anki_decks', deckId);
  if (!deck) {
    return { success: false, error: 'Deck not found' };
  }

  const now = new Date().toISOString();
  await db.put('anki_decks', { ...deck, deleted_at: now, updated_at: now });

  const allNotes = (await db.getAllFromIndex('anki_notes', 'deck_id', deckId)) || [];
  const notePromises = allNotes
    .filter((note) => !note.deleted_at)
    .map((note) =>
      db.put('anki_notes', { ...note, deleted_at: now, updated_at: now })
    );

  const allCards = (await db.getAllFromIndex('anki_cards', 'deck_id', deckId)) || [];
  const cardPromises = allCards
    .filter((card) => !card.deleted_at)
    .map((card) =>
      db.put('anki_cards', { ...card, deleted_at: now, updated_at: now })
    );

  await Promise.all([...notePromises, ...cardPromises]);
  return { success: true };
}

export async function resetDeckProgress(
  db: IDBPDatabase<CadernoDBSchema>,
  deckId: string
): Promise<{ success: boolean }> {
  const now = new Date().toISOString();
  const allCards = (await db.getAllFromIndex('anki_cards', 'deck_id', deckId)) || [];
  const cardIdsInDeck = new Set<string>(allCards.map((c) => c.id));

  const cardUpdates = allCards.map((card) =>
    db.put('anki_cards', {
      ...card,
      srs_state: null,
      state: 0,
      reps: 0,
      lapses: 0,
      stability: 0,
      difficulty: 0,
      due_date: null,
      updated_at: now,
    })
  );

  const allReviews = (await db.getAll('anki_reviews')) || [];
  const reviewUpdates = allReviews
    .filter((r) => cardIdsInDeck.has(r.card_id) && !r.deleted_at)
    .map((review) =>
      db.put('anki_reviews', {
        ...review,
        deleted_at: now,
        updated_at: now,
      })
    );

  await Promise.all([...cardUpdates, ...reviewUpdates]);
  return { success: true };
}

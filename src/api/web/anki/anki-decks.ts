export async function getDecks(db: any) {
  const all = (await db.getAll('anki_decks')) || [];
  const decks = all
    .filter((d: any) => !d.deleted_at)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { success: true, decks };
}

export async function createDeck(
  db: any,
  generateId: () => string,
  name: string,
  description?: string,
  parentId?: string | null
) {
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

  return { success: true };
}

export async function updateDeck(db: any, deckId: string, name: string, description?: string) {
  const existing = await db.get('anki_decks', deckId);
  if (existing) {
    const updated = { ...existing, name, description, updated_at: new Date().toISOString() };
    await db.put('anki_decks', updated);
    return { success: true };
  }
  return { success: false, error: 'Deck not found' };
}

export async function deleteDeck(db: any, deckId: string) {
  const deck = await db.get('anki_decks', deckId);
  if (!deck) {
    return { success: false, error: 'Deck not found' };
  }

  const now = new Date().toISOString();
  await db.put('anki_decks', { ...deck, deleted_at: now, updated_at: now });

  const allNotes = (await db.getAllFromIndex('anki_notes', 'deck_id', deckId)) || [];
  const notePromises = allNotes
    .filter((note: any) => !note.deleted_at)
    .map((note: any) =>
      db.put('anki_notes', { ...note, deleted_at: now, updated_at: now })
    );

  const allCards = (await db.getAllFromIndex('anki_cards', 'deck_id', deckId)) || [];
  const cardPromises = allCards
    .filter((card: any) => !card.deleted_at)
    .map((card: any) =>
      db.put('anki_cards', { ...card, deleted_at: now, updated_at: now })
    );

  await Promise.all([...notePromises, ...cardPromises]);
  return { success: true };
}

export async function resetDeckProgress(db: any, deckId: string) {
  const now = new Date().toISOString();
  const allCards = (await db.getAllFromIndex('anki_cards', 'deck_id', deckId)) || [];
  const cardIdsInDeck = new Set<string>(allCards.map((c: any) => c.id));

  const cardUpdates = allCards.map((card: any) =>
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
    .filter((r: any) => cardIdsInDeck.has(r.card_id) && !r.deleted_at)
    .map((review: any) =>
      db.put('anki_reviews', {
        ...review,
        deleted_at: now,
        updated_at: now,
      })
    );

  await Promise.all([...cardUpdates, ...reviewUpdates]);
  return { success: true };
}

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
  parentId?: string
) {
  const deck = {
    id: generateId(),
    name,
    description: description || '',
    parent_id: parentId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
  if (deck) {
    deck.deleted_at = new Date().toISOString();
    deck.updated_at = new Date().toISOString();
    await db.put('anki_decks', deck);

    const allNotes = (await db.getAllFromIndex('anki_notes', 'deck_id', deckId)) || [];
    for (const note of allNotes) {
      note.deleted_at = new Date().toISOString();
      note.updated_at = new Date().toISOString();
      await db.put('anki_notes', note);
    }

    const allCards = (await db.getAllFromIndex('anki_cards', 'deck_id', deckId)) || [];
    for (const card of allCards) {
      card.deleted_at = new Date().toISOString();
      card.updated_at = new Date().toISOString();
      await db.put('anki_cards', card);
    }
    return { success: true };
  }
  return { success: false, error: 'Deck not found' };
}

export async function resetDeckProgress(db: any, deckId: string) {
  const allCards = (await db.getAllFromIndex('anki_cards', 'deck_id', deckId)) || [];
  for (const card of allCards) {
    card.srs_state = null;
    card.state = 0;
    card.reps = 0;
    card.lapses = 0;
    card.stability = 0;
    card.difficulty = 0;
    card.due_date = null;
    card.updated_at = new Date().toISOString();
    await db.put('anki_cards', card);
  }

  const allReviews = (await db.getAll('anki_reviews')) || [];
  for (const review of allReviews) {
    const card = await db.get('anki_cards', review.card_id);
    if (card && card.deck_id === deckId) {
      review.deleted_at = new Date().toISOString();
      review.updated_at = new Date().toISOString();
      await db.put('anki_reviews', review);
    }
  }
  return { success: true };
}

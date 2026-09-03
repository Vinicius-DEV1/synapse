import { generateCardsForNote } from './anki-cards-generator';
import { collectDescendantDeckIds } from './utils/deck-tree';
import { joinCardsWithNotes } from './utils/card-note-join';

export async function getNote(db: any, noteId: string) {
  return await db.get('anki_notes', noteId);
}

export async function getCard(db: any, cardId: string) {
  return await db.get('anki_cards', cardId);
}

export async function saveNote(db: any, generateId: () => string, noteData: any) {
  const noteId = noteData.id || generateId();
  const now = new Date().toISOString();
  const note = {
    ...noteData,
    id: noteId,
    created_at: noteData.created_at || now,
    updated_at: now,
  };
  await db.put('anki_notes', note);
  await generateCardsForNote(db, note, generateId);
  return { success: true, note_id: noteId };
}

export async function saveCard(db: any, generateId: () => string, cardData: any) {
  return await saveNote(db, generateId, cardData);
}

export async function updateNote(db: any, generateId: () => string, noteId: string, noteData: any) {
  const existing = await db.get('anki_notes', noteId);
  if (existing) {
    const updated = { ...existing, ...noteData, updated_at: new Date().toISOString() };
    await db.put('anki_notes', updated);
    await generateCardsForNote(db, updated, generateId);
    return { success: true };
  }
  return { success: false, error: 'Note not found' };
}

export async function updateCard(db: any, generateId: () => string, cardId: string, data: any) {
  const card = await db.get('anki_cards', cardId);
  if (card && card.note_id) {
    // If deck_id is being updated on the card, update the note and card deck_id together
    if (data.deck_id && data.deck_id !== card.deck_id) {
      const now = new Date().toISOString();
      await db.put('anki_cards', { ...card, deck_id: data.deck_id, updated_at: now });
      const note = await db.get('anki_notes', card.note_id);
      if (note) {
        await db.put('anki_notes', { ...note, deck_id: data.deck_id, updated_at: now });
      }
    }
    return await updateNote(db, generateId, card.note_id, data);
  }
  return { success: false, error: 'Card not found' };
}

export async function deleteNote(db: any, noteId: string) {
  const note = await db.get('anki_notes', noteId);
  if (!note) {
    return { success: false, error: 'Note not found' };
  }

  const now = new Date().toISOString();
  await db.put('anki_notes', { ...note, deleted_at: now, updated_at: now });

  let cards: any[] = [];
  try {
    if (typeof db.getAllFromIndex === 'function') {
      const indexed = await db.getAllFromIndex('anki_cards', 'note_id', noteId);
      if (Array.isArray(indexed)) cards = indexed;
    }
  } catch {
    // Fallback if index does not exist
  }

  if (cards.length === 0) {
    const allCards = (await db.getAll('anki_cards')) || [];
    cards = allCards.filter((c: any) => c.note_id === noteId);
  }

  const cardPromises = cards
    .filter((c: any) => !c.deleted_at)
    .map((c: any) =>
      db.put('anki_cards', { ...c, deleted_at: now, updated_at: now })
    );

  await Promise.all(cardPromises);
  return { success: true };
}

export async function deleteCard(db: any, _generateId: () => string, cardId: string) {
  const card = await db.get('anki_cards', cardId);
  if (card && card.note_id) {
    return await deleteNote(db, card.note_id);
  }
  return { success: false, error: 'Card not found' };
}

export async function getAllCards(db: any, deckId?: string) {
  const allCards: any[] = (await db.getAll('anki_cards')) || [];
  const allNotes: any[] = (await db.getAll('anki_notes')) || [];

  let validCards = allCards.filter((c: any) => !c.deleted_at);

  if (deckId) {
    const allDecks = (await db.getAll('anki_decks')) || [];
    const activeDecks = allDecks.filter((d: any) => !d.deleted_at);
    const deckIds = collectDescendantDeckIds(activeDecks, deckId);
    validCards = validCards.filter((c: any) => deckIds.has(c.deck_id));
  }

  const joinedCards = joinCardsWithNotes(validCards, allNotes);
  return { success: true, cards: joinedCards };
}

export async function deleteCardsBulk(db: any, cardIds: string[]) {
  const cardIdSet = new Set(cardIds);
  const allCards: any[] = (await db.getAll('anki_cards')) || [];
  const targetNotes = new Set<string>();

  for (const c of allCards) {
    if (cardIdSet.has(c.id) && c.note_id) {
      targetNotes.add(c.note_id);
    }
  }

  const now = new Date().toISOString();

  const notePromises = Array.from(targetNotes).map(async (noteId) => {
    const note = await db.get('anki_notes', noteId);
    if (note && !note.deleted_at) {
      await db.put('anki_notes', { ...note, deleted_at: now, updated_at: now });
    }
  });

  const cardPromises = allCards
    .filter((c: any) => targetNotes.has(c.note_id) && !c.deleted_at)
    .map((c: any) =>
      db.put('anki_cards', { ...c, deleted_at: now, updated_at: now })
    );

  await Promise.all([...notePromises, ...cardPromises]);
  return { success: true };
}

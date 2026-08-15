import { generateCardsForNote } from './anki-cards-generator';

export async function getNote(db: any, noteId: string) {
  return await db.get('anki_notes', noteId);
}

export async function getCard(db: any, cardId: string) {
  return await db.get('anki_cards', cardId);
}

export async function saveNote(db: any, generateId: () => string, noteData: any) {
  const noteId = noteData.id || generateId();
  const note = {
    ...noteData,
    id: noteId,
    created_at: noteData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
    return await updateNote(db, generateId, card.note_id, data);
  }
  return { success: false, error: 'Card not found' };
}

export async function deleteNote(db: any, noteId: string) {
  const note = await db.get('anki_notes', noteId);
  if (note) {
    note.deleted_at = new Date().toISOString();
    note.updated_at = new Date().toISOString();
    await db.put('anki_notes', note);

    const allCards = (await db.getAll('anki_cards')) || [];
    for (const c of allCards) {
      if (c.note_id === noteId && !c.deleted_at) {
        c.deleted_at = new Date().toISOString();
        c.updated_at = new Date().toISOString();
        await db.put('anki_cards', c);
      }
    }
    return { success: true };
  }
  return { success: false, error: 'Note not found' };
}

export async function deleteCard(db: any, generateId: () => string, cardId: string) {
  const card = await db.get('anki_cards', cardId);
  if (card && card.note_id) {
    return await deleteNote(db, card.note_id);
  }
  return { success: false, error: 'Card not found' };
}

export async function getAllCards(db: any, deckId?: string) {
  const allCards = (await db.getAll('anki_cards')) || [];
  const allNotes = (await db.getAll('anki_notes')) || [];
  const notesMap = new Map(
    allNotes.filter((n: any) => !n.deleted_at).map((n: any) => [n.id, n])
  );

  let validCards = allCards.filter((c: any) => !c.deleted_at);

  if (deckId) {
    const allDecks = (await db.getAll('anki_decks')) || [];
    const activeDecks = allDecks.filter((d: any) => !d.deleted_at);
    const deckIds = new Set<string>();
    deckIds.add(deckId);

    let added = true;
    while (added) {
      added = false;
      for (const d of activeDecks) {
        if (d.parent_id && deckIds.has(d.parent_id) && !deckIds.has(d.id)) {
          deckIds.add(d.id);
          added = true;
        }
      }
    }
    validCards = validCards.filter((c: any) => deckIds.has(c.deck_id));
  }

  const joinedCards = validCards
    .map((c: any) => {
      const note = notesMap.get(c.note_id);
      return note ? { ...note, ...c, id: c.id, note_id: note.id, deck_id: c.deck_id } : null;
    })
    .filter((c: any) => c !== null);

  return { success: true, cards: joinedCards };
}

export async function deleteCardsBulk(db: any, cardIds: string[]) {
  const allCards = (await db.getAll('anki_cards')) || [];
  const targetNotes = new Set<string>();

  for (const id of cardIds) {
    const card = allCards.find((c: any) => c.id === id);
    if (card && card.note_id) {
      targetNotes.add(card.note_id);
    }
  }

  for (const noteId of targetNotes) {
    const note = await db.get('anki_notes', noteId);
    if (note) {
      note.deleted_at = new Date().toISOString();
      note.updated_at = new Date().toISOString();
      await db.put('anki_notes', note);
    }
    for (const c of allCards) {
      if (c.note_id === noteId && !c.deleted_at) {
        c.deleted_at = new Date().toISOString();
        c.updated_at = new Date().toISOString();
        await db.put('anki_cards', c);
      }
    }
  }

  return { success: true };
}

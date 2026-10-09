import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../../services/db-web-schema';
import type { AnkiNoteRecord, AnkiCardRecord, AnkiCard } from '../../../types/anki';
import { generateCardsForNote } from './anki-cards-generator';
import { collectDescendantDeckIds } from './utils/deck-tree';
import { joinCardsWithNotes } from './utils/card-note-join';

export async function getNote(
  db: IDBPDatabase<CadernoDBSchema>,
  noteId: string
): Promise<AnkiNoteRecord | undefined> {
  return await db.get('anki_notes', noteId);
}

export async function getCard(
  db: IDBPDatabase<CadernoDBSchema>,
  cardId: string
): Promise<AnkiCard | undefined> {
  const card = await db.get('anki_cards', cardId);
  if (!card) return undefined;
  const note = card.note_id ? await db.get('anki_notes', card.note_id) : undefined;
  return {
    id: card.id,
    deck_id: card.deck_id,
    note_id: card.note_id,
    ord: card.ord,
    state: card.state,
    due_date: card.due_date,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    last_review: card.last_review,
    front: note?.front || '',
    back: note?.back || '',
    extra_note: note?.extra_note,
    tags: note?.tags || [],
    card_type: note?.card_type,
    validation_mode: note?.validation_mode,
    media_url: note?.media_url,
    created_at: card.created_at,
    updated_at: card.updated_at,
  };
}

export async function saveNote(
  db: IDBPDatabase<CadernoDBSchema>,
  generateId: () => string,
  noteData: Partial<AnkiNoteRecord> & { deck_id: string; front: string; back: string }
): Promise<{ success: boolean; note_id: string }> {
  const noteId = noteData.id || generateId();
  const now = new Date().toISOString();
  const note: AnkiNoteRecord = {
    ...noteData,
    id: noteId,
    created_at: noteData.created_at || now,
    updated_at: now,
  };
  await db.put('anki_notes', note);
  await generateCardsForNote(db, note, generateId);
  return { success: true, note_id: noteId };
}

export async function saveCard(
  db: IDBPDatabase<CadernoDBSchema>,
  generateId: () => string,
  cardData: Partial<AnkiNoteRecord> & { deck_id: string; front: string; back: string }
): Promise<{ success: boolean; note_id: string }> {
  return await saveNote(db, generateId, cardData);
}

export async function updateNote(
  db: IDBPDatabase<CadernoDBSchema>,
  generateId: () => string,
  noteId: string,
  noteData: Partial<AnkiNoteRecord>
): Promise<{ success: boolean; error?: string }> {
  const existing = await db.get('anki_notes', noteId);
  if (existing) {
    const updated: AnkiNoteRecord = { ...existing, ...noteData, updated_at: new Date().toISOString() };
    await db.put('anki_notes', updated);
    await generateCardsForNote(db, updated, generateId);
    return { success: true };
  }
  return { success: false, error: 'Note not found' };
}

export async function updateCard(
  db: IDBPDatabase<CadernoDBSchema>,
  generateId: () => string,
  cardId: string,
  data: Partial<AnkiNoteRecord>
): Promise<{ success: boolean; error?: string }> {
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

export async function deleteNote(
  db: IDBPDatabase<CadernoDBSchema>,
  noteId: string
): Promise<{ success: boolean; error?: string }> {
  const note = await db.get('anki_notes', noteId);
  if (!note) {
    return { success: false, error: 'Note not found' };
  }

  const now = new Date().toISOString();
  await db.put('anki_notes', { ...note, deleted_at: now, updated_at: now });

  let cards: AnkiCardRecord[] = [];
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
    cards = allCards.filter((c) => c.note_id === noteId);
  }

  const cardPromises = cards
    .filter((c) => !c.deleted_at)
    .map((c) =>
      db.put('anki_cards', { ...c, deleted_at: now, updated_at: now })
    );

  await Promise.all(cardPromises);
  return { success: true };
}

export async function deleteCard(
  db: IDBPDatabase<CadernoDBSchema>,
  _generateId: () => string,
  cardId: string
): Promise<{ success: boolean; error?: string }> {
  const card = await db.get('anki_cards', cardId);
  if (card && card.note_id) {
    return await deleteNote(db, card.note_id);
  }
  return { success: false, error: 'Card not found' };
}

export async function getAllCards(
  db: IDBPDatabase<CadernoDBSchema>,
  deckId?: string
): Promise<{ success: boolean; cards: AnkiCard[] }> {
  const allCards = (await db.getAll('anki_cards')) || [];
  const allNotes = (await db.getAll('anki_notes')) || [];

  let validCards = allCards.filter((c) => !c.deleted_at);

  if (deckId) {
    const allDecks = (await db.getAll('anki_decks')) || [];
    const activeDecks = allDecks.filter((d) => !d.deleted_at);
    const deckIds = collectDescendantDeckIds(activeDecks, deckId);
    validCards = validCards.filter((c) => deckIds.has(c.deck_id));
  }

  const joinedCards = joinCardsWithNotes(validCards, allNotes);
  return { success: true, cards: joinedCards };
}

export async function deleteCardsBulk(
  db: IDBPDatabase<CadernoDBSchema>,
  cardIds: string[]
): Promise<{ success: boolean }> {
  const cardIdSet = new Set(cardIds);
  const allCards = (await db.getAll('anki_cards')) || [];
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
    .filter((c) => targetNotes.has(c.note_id) && !c.deleted_at)
    .map((c) =>
      db.put('anki_cards', { ...c, deleted_at: now, updated_at: now })
    );

  await Promise.all([...notePromises, ...cardPromises]);
  return { success: true };
}

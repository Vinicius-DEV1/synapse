import type { IDBPDatabase } from 'idb';
import type { CadernoDBSchema } from '../../../services/db-web-schema';
import type { AnkiNoteRecord, AnkiDeckSettings } from '../../../types/anki';
import { migrateToNotes } from './anki-migration';
import { exportDeckRecursive, importDeck, type ImportDeckPayload } from './anki-import-export';
import { getDecks, createDeck, updateDeck, deleteDeck, resetDeckProgress } from './anki-decks';
import {
  getNote,
  getCard,
  saveNote,
  saveCard,
  updateNote,
  updateCard,
  deleteNote,
  deleteCard,
  getAllCards,
  deleteCardsBulk,
} from './anki-notes';
import { getReviews, getDueCards, reviewCard, getCardIntervals, getTotalDueCount } from './anki-reviews';
import { getDeckSettings, updateDeckSettings } from './anki-settings';

export const webAnkiApi = (db: IDBPDatabase<CadernoDBSchema>, generateId: () => string) => ({
  migrateToNotes: () => migrateToNotes(db, generateId),
  exportDeckRecursive: (deckId: string) => exportDeckRecursive(db, deckId),
  importDeck: (payload: ImportDeckPayload | unknown) => importDeck(db, payload),
  getDecks: () => getDecks(db),
  getReviews: () => getReviews(db),
  createDeck: (name: string, description?: string, parentId?: string | null) =>
    createDeck(db, generateId, name, description, parentId),
  getNote: (noteId: string) => getNote(db, noteId),
  getCard: (cardId: string) => getCard(db, cardId),
  saveNote: (noteData: Partial<AnkiNoteRecord> & { deck_id: string; front: string; back: string }) =>
    saveNote(db, generateId, noteData),
  saveCard: (cardData: Partial<AnkiNoteRecord> & { deck_id: string; front: string; back: string }) =>
    saveCard(db, generateId, cardData),
  updateNote: (noteId: string, noteData: Partial<AnkiNoteRecord>) =>
    updateNote(db, generateId, noteId, noteData),
  updateCard: (cardId: string, data: Partial<AnkiNoteRecord>) =>
    updateCard(db, generateId, cardId, data),
  deleteNote: (noteId: string) => deleteNote(db, noteId),
  deleteCard: (cardId: string) => deleteCard(db, generateId, cardId),
  getDueCards: (deckId: string) => getDueCards(db, deckId),
  getTotalDueCount: () => getTotalDueCount(db),
  reviewCard: (cardId: string, rating: number) => reviewCard(db, generateId, cardId, rating),
  getCardIntervals: (cardId: string) => getCardIntervals(db, cardId),
  getDeckSettings: (deckId: string) => getDeckSettings(db, deckId),
  updateDeckSettings: (deckId: string, settings: Partial<AnkiDeckSettings>) =>
    updateDeckSettings(db, generateId, deckId, settings),
  getAllCards: (deckId?: string) => getAllCards(db, deckId),
  deleteCardsBulk: (cardIds: string[]) => deleteCardsBulk(db, cardIds),
  updateDeck: (deckId: string, name: string, description?: string) =>
    updateDeck(db, deckId, name, description),
  deleteDeck: (deckId: string) => deleteDeck(db, deckId),
  resetDeckProgress: (deckId: string) => resetDeckProgress(db, deckId),
});

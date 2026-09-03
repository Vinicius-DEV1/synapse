import { migrateToNotes } from './anki-migration';
import { exportDeckRecursive, importDeck } from './anki-import-export';
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
import { getReviews, getDueCards, reviewCard, getCardIntervals } from './anki-reviews';
import { getDeckSettings, updateDeckSettings } from './anki-settings';

export const webAnkiApi = (db: any, generateId: () => string) => ({
  migrateToNotes: () => migrateToNotes(db, generateId),
  exportDeckRecursive: (deckId: string) => exportDeckRecursive(db, deckId),
  importDeck: (payload: any) => importDeck(db, payload),
  getDecks: () => getDecks(db),
  getReviews: () => getReviews(db),
  createDeck: (name: string, description?: string, parentId?: string | null) =>
    createDeck(db, generateId, name, description, parentId),
  getNote: (noteId: string) => getNote(db, noteId),
  getCard: (cardId: string) => getCard(db, cardId),
  saveNote: (noteData: any) => saveNote(db, generateId, noteData),
  saveCard: (cardData: any) => saveCard(db, generateId, cardData),
  updateNote: (noteId: string, noteData: any) => updateNote(db, generateId, noteId, noteData),
  updateCard: (cardId: string, data: any) => updateCard(db, generateId, cardId, data),
  deleteNote: (noteId: string) => deleteNote(db, noteId),
  deleteCard: (cardId: string) => deleteCard(db, generateId, cardId),
  getDueCards: (deckId: string) => getDueCards(db, deckId),
  reviewCard: (cardId: string, rating: number) => reviewCard(db, generateId, cardId, rating),
  getCardIntervals: (cardId: string) => getCardIntervals(db, cardId),
  getDeckSettings: (deckId: string) => getDeckSettings(db, deckId),
  updateDeckSettings: (deckId: string, settings: any) =>
    updateDeckSettings(db, generateId, deckId, settings),
  getAllCards: (deckId?: string) => getAllCards(db, deckId),
  deleteCardsBulk: (cardIds: string[]) => deleteCardsBulk(db, cardIds),
  updateDeck: (deckId: string, name: string, description?: string) =>
    updateDeck(db, deckId, name, description),
  deleteDeck: (deckId: string) => deleteDeck(db, deckId),
  resetDeckProgress: (deckId: string) => resetDeckProgress(db, deckId),
});

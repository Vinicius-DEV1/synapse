import { invoke } from '@tauri-apps/api/core';
import type {
  AnkiDeckRecord,
  AnkiCard,
  AnkiNoteRecord,
  AnkiCardRecord,
  AnkiDeckSettings,
  AnkiReviewRecord,
} from '../../types/anki';
import { processReview } from '../../services/fsrs';

export const tauriAnkiApi = {
  getDecks: async (): Promise<{ success: boolean; decks: AnkiDeckRecord[]; error?: string }> => {
    try {
      const raw = await invoke<AnkiDeckRecord[]>('anki_get_decks');
      const decks = Array.isArray(raw) ? raw : [];
      return { success: true, decks };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Tauri SRS] Failed to fetch decks:', err);
      return { success: false, decks: [], error: message };
    }
  },

  getReviews: async (): Promise<{ success: boolean; reviews: AnkiReviewRecord[] }> => {
    try {
      const res = await invoke<AnkiReviewRecord[]>('anki_get_reviews');
      return { success: true, reviews: res || [] };
    } catch (err: unknown) {
      console.error('[Tauri SRS] Failed to fetch reviews:', err);
      return { success: true, reviews: [] };
    }
  },

  createDeck: async (
    name: string,
    desc?: string,
    parentId?: string
  ): Promise<{ success: boolean; id: string }> => {
    const id = await invoke<string>('anki_create_deck', {
      name,
      description: desc,
      parent_id: parentId,
    });
    return { success: true, id };
  },

  saveCard: async (
    c: Partial<AnkiCardRecord> & { deck_id: string; front: string; back: string }
  ): Promise<{ success: boolean; id: string; note_id: string }> => {
    const id = await invoke<string>('anki_save_card', { card: c });
    return { success: true, id, note_id: id };
  },

  saveNote: async (
    n: Partial<AnkiNoteRecord> & { deck_id: string; front: string; back: string }
  ): Promise<{ success: boolean; id: string; note_id: string }> => {
    const id = await invoke<string>('anki_save_card', { card: n });
    return { success: true, id, note_id: id };
  },

  getDueCards: async (deckId: string): Promise<AnkiCard[]> => {
    const allCards = (await invoke<AnkiCard[]>('anki_get_all_cards', { deckId })) || [];
    const settings = (await invoke<AnkiDeckSettings>('anki_get_deck_settings', { deckId }).catch(
      () => null
    )) || {
      new_limit: 20,
      review_limit: 200,
    };

    const now = new Date().toISOString();
    let newCards: AnkiCard[] = [];
    const learningCards: AnkiCard[] = [];
    let reviewCards: AnkiCard[] = [];

    for (const c of allCards) {
      const state = Number(c.state) || 0;
      if (state === 0) {
        newCards.push(c);
      } else if (state === 1 || state === 3) {
        if (c.due_date && c.due_date <= now) learningCards.push(c);
      } else if (state === 2) {
        if (c.due_date && c.due_date <= now) reviewCards.push(c);
      }
    }

    newCards.sort(
      (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
    );
    learningCards.sort(
      (a, b) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime()
    );
    reviewCards.sort(
      (a, b) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime()
    );

    newCards = newCards.slice(0, settings.new_limit);
    reviewCards = reviewCards.slice(0, settings.review_limit);

    return [...learningCards, ...reviewCards, ...newCards];
  },

  getTotalDueCount: async (): Promise<number> => {
    return await invoke<number>('anki_get_total_due_count');
  },

  reviewCard: async (cardId: string, rating: number): Promise<{ success: boolean; error?: string }> => {
    const card = await invoke<AnkiCard>('anki_get_card', { cardId });
    if (!card) return { success: false, error: 'Card not found' };

    const settings = await invoke<AnkiDeckSettings>('anki_get_deck_settings', {
      deckId: card.deck_id,
    }).catch(() => null);

    const fsrsState = processReview(card, rating, settings);

    const stateObj = {
      stability: fsrsState.stability,
      difficulty: fsrsState.difficulty,
      elapsed_days: fsrsState.elapsed_days,
      scheduled_days: fsrsState.scheduled_days,
      reps: fsrsState.reps,
      lapses: fsrsState.lapses,
      state: String(fsrsState.state),
      due_date: fsrsState.due.toISOString(),
      last_review: fsrsState.last_review?.toISOString() || new Date().toISOString(),
    };

    await invoke('anki_review_card_fsrs', { cardId, rating, state: stateObj });
    return { success: true };
  },

  getCardIntervals: async (
    cardId: string
  ): Promise<{ success: boolean; intervals?: string[]; error?: string }> => {
    try {
      const card = await invoke<AnkiCard>('anki_get_card', { cardId });
      if (!card) return { success: false, error: 'Card not found' };
      const settings = await invoke<AnkiDeckSettings>('anki_get_deck_settings', {
        deckId: card.deck_id,
      }).catch(() => null);
      const { previewIntervals } = await import('../../services/fsrs');
      const intervals = previewIntervals(card, settings);
      return { success: true, intervals };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  },

  getAllCards: async (
    deckId?: string
  ): Promise<{ success: boolean; cards: AnkiCard[]; error?: string }> => {
    try {
      const cards = await invoke<AnkiCard[]>('anki_get_all_cards', { deckId });
      return { success: true, cards: Array.isArray(cards) ? cards : [] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Tauri SRS] Failed to get all cards:', err);
      return { success: false, error: message, cards: [] };
    }
  },

  deleteCard: async (cardId: string): Promise<{ success: boolean }> => {
    await invoke('anki_delete_card', { cardId });
    return { success: true };
  },

  deleteNote: async (noteId: string): Promise<{ success: boolean }> => {
    try {
      await invoke('anki_delete_note', { noteId });
    } catch {
      await invoke('anki_delete_card', { cardId: noteId });
    }
    return { success: true };
  },

  deleteCardsBulk: async (cardIds: string[]): Promise<{ success: boolean }> => {
    await Promise.all(cardIds.map((id) => invoke('anki_delete_card', { cardId: id })));
    return { success: true };
  },

  updateCard: async (
    cardId: string,
    c: Partial<AnkiCard>
  ): Promise<{ success: boolean }> => {
    await invoke('anki_update_card', { cardId, card: c });
    return { success: true };
  },

  updateNote: async (
    noteId: string,
    n: Partial<AnkiNoteRecord>
  ): Promise<{ success: boolean }> => {
    try {
      await invoke('anki_update_note', { noteId, note: n });
    } catch {
      await invoke('anki_update_card', { cardId: noteId, card: n });
    }
    return { success: true };
  },

  moveCards: async (): Promise<{ success: boolean }> => ({ success: true }),

  updateDeck: async (
    deckId: string,
    name: string,
    description: string
  ): Promise<{ success: boolean }> => {
    await invoke('anki_update_deck', { deckId, name, description });
    return { success: true };
  },

  deleteDeck: async (deckId: string): Promise<{ success: boolean }> => {
    await invoke('anki_delete_deck', { deckId });
    return { success: true };
  },

  resetDeckProgress: async (
    deckId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await invoke('anki_reset_deck', { deckId });
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  },

  getDeckSettings: async (deckId: string): Promise<AnkiDeckSettings> => {
    return await invoke<AnkiDeckSettings>('anki_get_deck_settings', { deckId });
  },

  updateDeckSettings: async (
    deckId: string,
    settings: Partial<AnkiDeckSettings>
  ): Promise<{ success: boolean }> => {
    await invoke('anki_update_deck_settings', { deckId, settings });
    return { success: true };
  },

  getCard: async (cardId: string): Promise<AnkiCard | undefined> => {
    try {
      const card = await invoke<AnkiCard>('anki_get_card', { cardId });
      return card || undefined;
    } catch {
      return undefined;
    }
  },
};

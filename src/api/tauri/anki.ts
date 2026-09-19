import { invoke } from '@tauri-apps/api/core';
import { processReview } from '../../services/fsrs';

export const tauriAnkiApi = {
  getDecks: async () => await invoke('anki_get_decks'),
  getReviews: async () => {
    try {
      const res: any = await invoke('anki_get_reviews');
      return { success: true, reviews: res || [] };
    } catch (err) {
      console.error('[Tauri SRS] Failed to fetch reviews:', err);
      return { success: true, reviews: [] };
    }
  },
  createDeck: async (name: string, desc?: string, parentId?: string) =>
    await invoke('anki_create_deck', { name, description: desc, parent_id: parentId }),
  saveCard: async (c: any) => await invoke('anki_save_card', { card: c }),
  saveNote: async (n: any) => await invoke('anki_save_card', { card: n }),

  getDueCards: async (deckId: string) => {
    const allCards: any[] = (await invoke('anki_get_all_cards', { deckId })) || [];
    const settings: any =
      (await invoke('anki_get_deck_settings', { deckId }).catch(() => null)) || {
        new_limit: 20,
        review_limit: 200,
      };

    const now = new Date().toISOString();
    let newCards = [];
    let learningCards = [];
    let reviewCards = [];

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

  reviewCard: async (cardId: string, rating: number) => {
    const card: any = await invoke('anki_get_card', { cardId });
    if (!card) return false;

    const settings: any = await invoke('anki_get_deck_settings', { deckId: card.deck_id }).catch(
      () => null
    );

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

    return await invoke('anki_review_card_fsrs', { cardId, rating, state: stateObj });
  },

  getCardIntervals: async (cardId: string) => {
    try {
      const card: any = await invoke('anki_get_card', { cardId });
      if (!card) return { success: false, error: 'Card not found' };
      const settings: any = await invoke('anki_get_deck_settings', { deckId: card.deck_id }).catch(
        () => null
      );
      const { previewIntervals } = await import('../../services/fsrs');
      const intervals = previewIntervals(card, settings);
      return { success: true, intervals };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  getAllCards: async (deckId?: string) => {
    try {
      const cards: any = await invoke('anki_get_all_cards', { deckId });
      return { success: true, cards: Array.isArray(cards) ? cards : [] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Tauri SRS] Failed to get all cards:', err);
      return { success: false, error: message, cards: [] };
    }
  },
  deleteCard: async (cardId: string) => await invoke('anki_delete_card', { cardId }),
  deleteNote: async (noteId: string) => {
    try {
      return await invoke('anki_delete_note', { noteId });
    } catch {
      return await invoke('anki_delete_card', { cardId: noteId });
    }
  },
  deleteCardsBulk: async (cardIds: string[]) => {
    await Promise.all(cardIds.map((id) => invoke('anki_delete_card', { cardId: id })));
  },
  updateCard: async (cardId: string, c: any) =>
    await invoke('anki_update_card', { cardId, card: c }),
  updateNote: async (noteId: string, n: any) => {
    try {
      return await invoke('anki_update_note', { noteId, note: n });
    } catch {
      return await invoke('anki_update_card', { cardId: noteId, card: n });
    }
  },
  moveCards: async () => {}, // mock
  updateDeck: async (deckId: string, name: string, description: string) =>
    await invoke('anki_update_deck', { deckId, name, description }),
  deleteDeck: async (deckId: string) => await invoke('anki_delete_deck', { deckId }),
  resetDeckProgress: async (deckId: string) => await invoke('anki_reset_deck', { deckId }),
  getDeckSettings: async (deckId: string) => await invoke('anki_get_deck_settings', { deckId }),
  updateDeckSettings: async (deckId: string, settings: any) =>
    await invoke('anki_update_deck_settings', { deckId, settings }),
};

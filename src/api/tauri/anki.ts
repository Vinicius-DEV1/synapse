import { invoke } from '@tauri-apps/api/core';
import { processReview } from '../../services/fsrs';

export const tauriAnkiApi = {
  getDecks: async () => await invoke('anki_get_decks'),
  createDeck: async (name: string, desc?: string, parentId?: string) => await invoke('anki_create_deck', { name, description: desc, parent_id: parentId }),
  saveCard: async (c: any) => await invoke('anki_save_card', { card: c }),
  
  getDueCards: async (deckId: string) => {
    // We can fetch all cards for the deck tree and filter/sort them here
    // But for performance, Tauri might already do a great job.
    // However, to apply daily limits per settings, we need to do it here just like Web.
    const allCards: any[] = await invoke('anki_get_all_cards', { deckId });
    const settings: any = await invoke('anki_get_deck_settings', { deckId }).catch(() => null) || { new_limit: 20, review_limit: 200 };
    
    const now = new Date().toISOString();
    let newCards = [];
    let learningCards = [];
    let reviewCards = [];
    
    for (const c of allCards) {
       const state = Number(c.state) || 0; // 0=New, 1=Learning, 2=Review, 3=Relearning
       if (state === 0) {
           newCards.push(c);
       } else if (state === 1 || state === 3) {
           if (c.due_date && c.due_date <= now) learningCards.push(c);
       } else if (state === 2) {
           if (c.due_date && c.due_date <= now) reviewCards.push(c);
       }
    }
    
    newCards.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    learningCards.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    reviewCards.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    
    newCards = newCards.slice(0, settings.new_limit);
    reviewCards = reviewCards.slice(0, settings.review_limit);
    
    return [...learningCards, ...reviewCards, ...newCards];
  },
  
  reviewCard: async (cardId: string, rating: number) => {
    // Need to fetch the card first to get its current state
    const card: any = await invoke('anki_get_card', { cardId });
    if (!card) return false;
    
    const settings: any = await invoke('anki_get_deck_settings', { deckId: card.deck_id }).catch(() => null);
    
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
  
  getAllCards: async (deckId?: string) => await invoke('anki_get_all_cards', { deckId }),
  deleteCard: async (cardId: string) => await invoke('anki_delete_card', { cardId }),
  deleteCardsBulk: async (cardIds: string[]) => { for(let id of cardIds) await invoke('anki_delete_card', { cardId: id }); },
  updateCard: async (cardId: string, c: any) => await invoke('anki_update_card', { cardId, card: c }),
  moveCards: async () => {}, // mock
  updateDeck: async (deckId: string, name: string, description: string) => await invoke('anki_update_deck', { deckId, name, description }),
  deleteDeck: async (deckId: string) => await invoke('anki_delete_deck', { deckId }),
  resetDeckProgress: async (deckId: string) => await invoke('anki_reset_deck', { deckId }),
  getDeckSettings: async (deckId: string) => await invoke('anki_get_deck_settings', { deckId }),
  updateDeckSettings: async (deckId: string, settings: any) => await invoke('anki_update_deck_settings', { deckId, settings }),
};

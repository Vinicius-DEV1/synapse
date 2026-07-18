import { invoke } from '@tauri-apps/api/core';

export const tauriAnkiApi = {
  getDecks: async () => await invoke('anki_get_decks'),
  createDeck: async (name: string, desc?: string, parentId?: string) => await invoke('anki_create_deck', { name, description: desc, parent_id: parentId }),
  saveCard: async (c: any) => await invoke('anki_save_card', { card: c }),
  getDueCards: async (deckId: string) => await invoke('anki_get_due_cards', { deckId }),
  reviewCard: async (cardId: string, rating: number) => await invoke('anki_review_card', { cardId, rating }),
  getAllCards: async (deckId?: string) => await invoke('anki_get_all_cards', { deckId }),
  deleteCard: async (cardId: string) => await invoke('anki_delete_card', { cardId }),
  deleteCardsBulk: async (cardIds: string[]) => { for(let id of cardIds) await invoke('anki_delete_card', { cardId: id }); },
  updateCard: async (cardId: string, c: any) => await invoke('anki_update_card', { cardId, card: c }),
  moveCards: async () => {} // mock
};

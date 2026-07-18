export const webAnkiApi = (db: any, generateId: () => string) => ({
  getDecks: async () => {
    const all = await db.getAll('anki_decks') || [];
    return all.filter((d: any) => !d.deleted_at).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  createDeck: async (name: string, description?: string, parentId?: string) => {
    const deck = {
      id: generateId(),
      name,
      description: description || '',
      parent_id: parentId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.put('anki_decks', deck);
    return { success: true };
  },
  saveCard: async (card: any) => {
    const newCard = {
      ...card,
      id: card.id || generateId(),
      created_at: card.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.put('anki_cards', newCard);
    return { success: true };
  },
  getDueCards: async (deckId: string) => {
    const all = await db.getAllFromIndex('anki_cards', 'deck_id', deckId) || [];
    // For now, return all cards as due (simplified FSRS logic)
    return all.filter((c: any) => !c.deleted_at);
  },
  reviewCard: async (cardId: string, rating: number) => {
    const card = await db.get('anki_cards', cardId);
    if (card) {
      // Simplified SRS update - in real implementation would use FSRS algorithm
      const updated = { ...card, updated_at: new Date().toISOString() };
      await db.put('anki_cards', updated);
      
      // Log the review
      const review = {
        id: generateId(),
        card_id: cardId,
        rating,
        reviewed_at: new Date().toISOString()
      };
      await db.put('anki_reviews', review);
      
      return { success: true };
    }
    return { success: false, error: 'Card not found' };
  },
  getAllCards: async (deckId?: string) => {
    if (deckId) {
      const all = await db.getAllFromIndex('anki_cards', 'deck_id', deckId) || [];
      return { success: true, cards: all.filter((c: any) => !c.deleted_at) };
    }
    const all = await db.getAll('anki_cards') || [];
    return { success: true, cards: all.filter((c: any) => !c.deleted_at) };
  },
  deleteCard: async (cardId: string) => {
    const card = await db.get('anki_cards', cardId);
    if (card) {
      card.deleted_at = new Date().toISOString();
      card.updated_at = new Date().toISOString();
      await db.put('anki_cards', card);
      return { success: true };
    }
    return { success: false, error: 'Card not found' };
  },
  deleteCardsBulk: async (cardIds: string[]) => {
    for (const id of cardIds) {
      const card = await db.get('anki_cards', id);
      if (card) {
        card.deleted_at = new Date().toISOString();
        card.updated_at = new Date().toISOString();
        await db.put('anki_cards', card);
      }
    }
    return { success: true };
  },
  updateCard: async (cardId: string, cardData: any) => {
    const existing = await db.get('anki_cards', cardId);
    if (existing) {
      const updated = { ...existing, ...cardData, updated_at: new Date().toISOString() };
      await db.put('anki_cards', updated);
      return { success: true };
    }
    return { success: false, error: 'Card not found' };
  },
  updateDeck: async (deckId: string, name: string, description?: string) => {
    const existing = await db.get('anki_decks', deckId);
    if (existing) {
      const updated = { ...existing, name, description, updated_at: new Date().toISOString() };
      await db.put('anki_decks', updated);
      return { success: true };
    }
    return { success: false, error: 'Deck not found' };
  },
  deleteDeck: async (deckId: string) => {
    const deck = await db.get('anki_decks', deckId);
    if (deck) {
      deck.deleted_at = new Date().toISOString();
      deck.updated_at = new Date().toISOString();
      await db.put('anki_decks', deck);
      
      // Also delete all cards in this deck
      const allCards = await db.getAllFromIndex('anki_cards', 'deck_id', deckId) || [];
      for (const card of allCards) {
        card.deleted_at = new Date().toISOString();
        card.updated_at = new Date().toISOString();
        await db.put('anki_cards', card);
      }
      
      return { success: true };
    }
    return { success: false, error: 'Deck not found' };
  },
  resetDeckProgress: async (deckId: string) => {
    // Reset SRS state for all cards in the deck
    const allCards = await db.getAllFromIndex('anki_cards', 'deck_id', deckId) || [];
    for (const card of allCards) {
      // Reset card to "new" state
      card.srs_state = null;
      card.updated_at = new Date().toISOString();
      await db.put('anki_cards', card);
    }
    
    // Clear review history for this deck's cards
    const allReviews = await db.getAll('anki_reviews') || [];
    for (const review of allReviews) {
      const card = await db.get('anki_cards', review.card_id);
      if (card && card.deck_id === deckId) {
        await db.delete('anki_reviews', review.id);
      }
    }
    
    return { success: true };
  },
  moveCards: async () => {
    // Mock implementation
    return { success: true };
  }
});

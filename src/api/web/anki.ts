export const webAnkiApi = (db: any, generateId: () => string) => ({
  getDecks: async () => {
    const all = await db.getAll('anki_decks') || [];
    const decks = all.filter((d: any) => !d.deleted_at).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { success: true, decks };
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
    const allDecks = await db.getAll('anki_decks') || [];
    const activeDecks = allDecks.filter((d: any) => !d.deleted_at);
    
    // Find all descendant deck IDs
    const deckIds = new Set<string>();
    deckIds.add(deckId);
    
    let added = true;
    while(added) {
      added = false;
      for (const d of activeDecks) {
        if (d.parent_id && deckIds.has(d.parent_id) && !deckIds.has(d.id)) {
          deckIds.add(d.id);
          added = true;
        }
      }
    }
    
    const allCards = await db.getAll('anki_cards') || [];
    return allCards.filter((c: any) => !c.deleted_at && deckIds.has(c.deck_id));
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
    const allCards = await db.getAll('anki_cards') || [];
    const validCards = allCards.filter((c: any) => !c.deleted_at);
    
    if (deckId) {
      const allDecks = await db.getAll('anki_decks') || [];
      const activeDecks = allDecks.filter((d: any) => !d.deleted_at);
      
      const deckIds = new Set<string>();
      deckIds.add(deckId);
      
      let added = true;
      while(added) {
        added = false;
        for (const d of activeDecks) {
          if (d.parent_id && deckIds.has(d.parent_id) && !deckIds.has(d.id)) {
            deckIds.add(d.id);
            added = true;
          }
        }
      }
      return { success: true, cards: validCards.filter((c: any) => deckIds.has(c.deck_id)) };
    }
    return { success: true, cards: validCards };
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
        review.deleted_at = new Date().toISOString();
        review.updated_at = new Date().toISOString();
        await db.put('anki_reviews', review);
      }
    }
    
    return { success: true };
  },
  moveCards: async () => {
    // Mock implementation
    return { success: true };
  }
});

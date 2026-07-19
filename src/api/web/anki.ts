import { processReview } from '../../services/fsrs';

export const webAnkiApi = (db: any, generateId: () => string) => ({
  // ... other methods intact ...
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
    
    // Create default settings for this deck
    const settings = {
      id: generateId(),
      deck_id: deck.id,
      new_limit: 20,
      review_limit: 200,
      learning_steps: '1m,10m',
      relearning_steps: '10m',
      fsrs_weights: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.put('anki_deck_settings', settings);
    
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
    const now = new Date().toISOString();
    
    // Fetch deck settings
    const allSettings = await db.getAll('anki_deck_settings') || [];
    const deckSettings = allSettings.find((s: any) => s.deck_id === deckId) || { new_limit: 20, review_limit: 200 };
    
    const validCards = allCards.filter((c: any) => !c.deleted_at && deckIds.has(c.deck_id));
    
    // First, classify the cards
    let newCards = [];
    let learningCards = [];
    let reviewCards = [];
    
    for (const c of validCards) {
       const state = Number(c.state) || 0; // 0=New, 1=Learning, 2=Review, 3=Relearning
       if (state === 0) {
           newCards.push(c);
       } else if (state === 1 || state === 3) {
           if (c.due_date && c.due_date <= now) {
               learningCards.push(c);
           }
       } else if (state === 2) {
           if (c.due_date && c.due_date <= now) {
               reviewCards.push(c);
           }
       }
    }
    
    // Sort New Cards by creation date
    newCards.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    // Sort Learning and Review by due date ascending
    learningCards.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    reviewCards.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    
    // Apply limits
    newCards = newCards.slice(0, deckSettings.new_limit);
    reviewCards = reviewCards.slice(0, deckSettings.review_limit);
    
    // The final queue: Learning > Review > New
    const finalQueue = [...learningCards, ...reviewCards, ...newCards];
    
    return finalQueue;
  },
  reviewCard: async (cardId: string, rating: number) => {
    const card = await db.get('anki_cards', cardId);
    if (card) {
      // Get settings for the deck this card belongs to
      const allSettings = await db.getAll('anki_deck_settings') || [];
      const deckSettings = allSettings.find((s: any) => s.deck_id === card.deck_id);
      
      const fsrsCardState = processReview(card, rating, deckSettings);
      
      const updated = { 
        ...card, 
        state: fsrsCardState.state,
        stability: fsrsCardState.stability,
        difficulty: fsrsCardState.difficulty,
        elapsed_days: fsrsCardState.elapsed_days,
        scheduled_days: fsrsCardState.scheduled_days,
        reps: fsrsCardState.reps,
        lapses: fsrsCardState.lapses,
        due_date: fsrsCardState.due.toISOString(),
        last_review: fsrsCardState.last_review?.toISOString() || new Date().toISOString(),
        updated_at: new Date().toISOString() 
      };
      
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
  getDeckSettings: async (deckId: string) => {
    const allSettings = await db.getAll('anki_deck_settings') || [];
    const settings = allSettings.find((s: any) => s.deck_id === deckId);
    if (settings) return settings;
    
    // Return defaults if none
    return {
      deck_id: deckId,
      new_limit: 20,
      review_limit: 200,
      learning_steps: '1m,10m',
      relearning_steps: '10m',
      fsrs_weights: null,
    };
  },
  updateDeckSettings: async (deckId: string, settings: any) => {
    const allSettings = await db.getAll('anki_deck_settings') || [];
    const existing = allSettings.find((s: any) => s.deck_id === deckId);
    
    if (existing) {
      await db.put('anki_deck_settings', {
        ...existing,
        ...settings,
        updated_at: new Date().toISOString()
      });
    } else {
      await db.put('anki_deck_settings', {
        id: generateId(),
        deck_id: deckId,
        ...settings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    return { success: true };
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

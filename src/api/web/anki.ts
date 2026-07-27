import { processReview } from '../../services/fsrs';

async function generateCardsForNote(db: any, note: any, generateId: () => string) {
  const allCards = await db.getAll('anki_cards') || [];
  const existingCards = allCards.filter((c: any) => c.note_id === note.id && !c.deleted_at);
  
  let requiredOrds = [0];
  if (note.card_type === 'cloze') {
     const matches = note.front.match(/\{\{c(\d+)::.*?\}\}/g);
     if (matches && matches.length > 0) {
       const ords = matches.map((m: string) => parseInt(m.match(/c(\d+)::/)![1], 10) - 1); // c1 -> ord 0
       requiredOrds = Array.from(new Set(ords)).sort((a: any, b: any) => a - b);
     }
  }

  // Create missing
  for (const ord of requiredOrds) {
    if (!existingCards.find((c: any) => c.ord === ord)) {
      const newCard = {
        id: generateId(),
        note_id: note.id,
        deck_id: note.deck_id,
        ord,
        state: 0, // New
        due_date: null,
        reps: 0,
        lapses: 0,
        stability: 0,
        difficulty: 0,
        scheduled_days: 0,
        elapsed_days: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.put('anki_cards', newCard);
    }
  }
  
  // Delete extra
  for (const card of existingCards) {
    if (!requiredOrds.includes(card.ord)) {
      card.deleted_at = new Date().toISOString();
      card.updated_at = new Date().toISOString();
      await db.put('anki_cards', card);
    }
  }
}

export const webAnkiApi = (db: any, generateId: () => string) => ({
  migrateToNotes: async () => {
    const allCards = await db.getAll('anki_cards') || [];
    let migratedCount = 0;
    
    for (const card of allCards) {
      if (card.front !== undefined && !card.deleted_at) {
        const noteId = generateId();
        
        let newFront = card.front;
        if (card.card_type === 'cloze') {
           newFront = newFront.replace(/\{\{(?!c\d+::)(.*?)\}\}/g, '{{c1::$1}}');
        }

        const note = {
          id: noteId,
          deck_id: card.deck_id,
          front: newFront,
          back: card.back || '',
          extra_note: card.extra_note || '',
          media_url: card.media_url || '',
          card_type: card.card_type || 'reading',
          validation_mode: card.validation_mode || 'exact',
          source_module: card.source_module || 'manual',
          source_id: card.source_id || '',
          created_at: card.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: card.deleted_at
        };

        await db.put('anki_notes', note);

        const updatedCard = { ...card };
        updatedCard.note_id = noteId;
        updatedCard.ord = 0;
        
        delete updatedCard.front;
        delete updatedCard.back;
        delete updatedCard.extra_note;
        delete updatedCard.media_url;
        delete updatedCard.card_type;
        delete updatedCard.validation_mode;
        delete updatedCard.source_module;
        delete updatedCard.source_id;

        await db.put('anki_cards', updatedCard);
        
        // Also if it's cloze with multiple cX, we need to generate other cards!
        await generateCardsForNote(db, note, generateId);
        
        migratedCount++;
      }
    }
    return { success: true, migratedCount };
  },

  exportDeckRecursive: async (deckId: string) => {
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

    const exportedDecks = activeDecks.filter((d: any) => deckIds.has(d.id));
    
    const allNotes = await db.getAll('anki_notes') || [];
    const exportedNotes = allNotes.filter((n: any) => !n.deleted_at && deckIds.has(n.deck_id));
    const noteIds = new Set(exportedNotes.map((n: any) => n.id));

    const allCards = await db.getAll('anki_cards') || [];
    const exportedCards = allCards.filter((c: any) => !c.deleted_at && noteIds.has(c.note_id));

    const payload = {
       decks: exportedDecks,
       notes: exportedNotes,
       cards: exportedCards
    };

    return { success: true, payload };
  },

  importDeck: async (payload: any) => {
    try {
      if (typeof payload !== 'object' || payload === null) {
        throw new Error('Payload inválido');
      }

      const { decks = [], notes = [], cards = [] } = payload;
      
      if (!Array.isArray(decks) || !Array.isArray(notes) || !Array.isArray(cards)) {
        throw new Error('Formato corrompido: decks, notes ou cards não são listas válidas.');
      }

      const stats = {
        decksCreated: 0, decksUpdated: 0, decksIgnored: 0,
        notesCreated: 0, notesUpdated: 0, notesIgnored: 0,
        cardsCreated: 0, cardsUpdated: 0, cardsIgnored: 0
      };

      const isIdentical = (a: any, b: any, ignoreKeys = ['updated_at', 'created_at', 'deleted_at']) => {
        const objA = { ...a };
        const objB = { ...b };
        ignoreKeys.forEach(k => { delete objA[k]; delete objB[k]; });
        return JSON.stringify(objA) === JSON.stringify(objB);
      };
      
      const now = new Date().toISOString();
      const tx = db.transaction(['anki_decks', 'anki_notes', 'anki_cards'], 'readwrite');
      const storeDecks = tx.objectStore('anki_decks');
      const storeNotes = tx.objectStore('anki_notes');
      const storeCards = tx.objectStore('anki_cards');

      for (const d of decks) {
        if (!d.id) throw new Error('Baralho sem ID detectado.');
        const existing = await storeDecks.get(d.id);
        if (existing) {
          if (isIdentical(existing, d)) {
            stats.decksIgnored++;
          } else {
            await storeDecks.put({ ...existing, ...d, updated_at: now });
            stats.decksUpdated++;
          }
        } else {
          await storeDecks.put({ ...d, updated_at: now });
          stats.decksCreated++;
        }
      }

      for (const n of notes) {
        if (!n.id) throw new Error('Nota sem ID detectada.');
        const existing = await storeNotes.get(n.id);
        if (existing) {
          if (isIdentical(existing, n)) {
            stats.notesIgnored++;
          } else {
            await storeNotes.put({ ...existing, ...n, updated_at: now });
            stats.notesUpdated++;
          }
        } else {
          await storeNotes.put({ ...n, updated_at: now });
          stats.notesCreated++;
        }
      }

      for (const c of cards) {
        if (!c.id) throw new Error('Cartão sem ID detectado.');
        const existing = await storeCards.get(c.id);
        if (existing) {
          if (isIdentical(existing, c, ['updated_at', 'created_at', 'deleted_at', 'last_reviewed', 'state', 'due', 'stability', 'difficulty'])) {
             stats.cardsIgnored++;
          } else {
             await storeCards.put({ ...existing, ...c, updated_at: now });
             stats.cardsUpdated++;
          }
        } else {
          await storeCards.put({ ...c, updated_at: now });
          stats.cardsCreated++;
        }
      }

      await tx.done;

      return { success: true, stats };
    } catch (e: any) {
      console.error('Import error:', e);
      return { success: false, error: e.message };
    }
  },

  getDecks: async () => {
    const all = await db.getAll('anki_decks') || [];
    const decks = all.filter((d: any) => !d.deleted_at).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { success: true, decks };
  },
  getReviews: async () => {
    const all = await db.getAll('anki_reviews') || [];
    const reviews = all.filter((r: any) => !r.deleted_at);
    return { success: true, reviews };
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
  
  getNote: async (noteId: string) => {
    return await db.get('anki_notes', noteId);
  },

  getCard: async (cardId: string) => {
    return await db.get('anki_cards', cardId);
  },

  saveNote: async (noteData: any) => {
    const noteId = noteData.id || generateId();
    const note = {
      ...noteData,
      id: noteId,
      created_at: noteData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.put('anki_notes', note);
    await generateCardsForNote(db, note, generateId);
    return { success: true, note_id: noteId };
  },

  saveCard: async (cardData: any) => {
    // Alias to saveNote
    return await webAnkiApi(db, generateId).saveNote(cardData);
  },

  updateNote: async (noteId: string, noteData: any) => {
    const existing = await db.get('anki_notes', noteId);
    if (existing) {
      const updated = { ...existing, ...noteData, updated_at: new Date().toISOString() };
      await db.put('anki_notes', updated);
      await generateCardsForNote(db, updated, generateId);
      return { success: true };
    }
    return { success: false, error: 'Note not found' };
  },

  updateCard: async (cardId: string, data: any) => {
    const card = await db.get('anki_cards', cardId);
    if (card && card.note_id) {
       return await webAnkiApi(db, generateId).updateNote(card.note_id, data);
    }
    return { success: false, error: 'Card not found' };
  },

  deleteNote: async (noteId: string) => {
    const note = await db.get('anki_notes', noteId);
    if (note) {
      note.deleted_at = new Date().toISOString();
      note.updated_at = new Date().toISOString();
      await db.put('anki_notes', note);
      
      const allCards = await db.getAll('anki_cards') || [];
      for (const c of allCards) {
        if (c.note_id === noteId && !c.deleted_at) {
           c.deleted_at = new Date().toISOString();
           c.updated_at = new Date().toISOString();
           await db.put('anki_cards', c);
        }
      }
      return { success: true };
    }
    return { success: false, error: 'Note not found' };
  },

  deleteCard: async (cardId: string) => {
    const card = await db.get('anki_cards', cardId);
    if (card && card.note_id) {
       return await webAnkiApi(db, generateId).deleteNote(card.note_id);
    }
    return { success: false, error: 'Card not found' };
  },

  getDueCards: async (deckId: string) => {
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
    
    const allCards = await db.getAll('anki_cards') || [];
    const allNotes = await db.getAll('anki_notes') || [];
    const notesMap = new Map(allNotes.filter((n: any) => !n.deleted_at).map((n: any) => [n.id, n]));
    
    const now = new Date().toISOString();
    const allSettings = await db.getAll('anki_deck_settings') || [];
    const deckSettings = allSettings.find((s: any) => s.deck_id === deckId) || { new_limit: 20, review_limit: 200 };
    
    const validCards = allCards.filter((c: any) => !c.deleted_at && deckIds.has(c.deck_id));
    
    const joinedCards = validCards.map((c: any) => {
       const note = notesMap.get(c.note_id);
       return note ? { ...note, ...c, id: c.id, note_id: note.id, deck_id: c.deck_id } : null;
    }).filter((c: any) => c !== null);

    let newCards: any[] = [];
    let learningCards: any[] = [];
    let reviewCards: any[] = [];
    
    for (const c of joinedCards) {
       const state = Number(c.state) || 0; 
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
    
    newCards.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
    learningCards.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    reviewCards.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    
    newCards = newCards.slice(0, deckSettings.new_limit);
    reviewCards = reviewCards.slice(0, deckSettings.review_limit);
    
    return [...learningCards, ...reviewCards, ...newCards];
  },

  reviewCard: async (cardId: string, rating: number) => {
    const card = await db.get('anki_cards', cardId);
    if (card) {
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

  getCardIntervals: async (cardId: string) => {
    const card = await db.get('anki_cards', cardId);
    if (card) {
      const allSettings = await db.getAll('anki_deck_settings') || [];
      const deckSettings = allSettings.find((s: any) => s.deck_id === card.deck_id);
      
      const { previewIntervals } = await import('../../services/fsrs');
      const intervals = previewIntervals(card, deckSettings);
      return { success: true, intervals };
    }
    return { success: false, error: 'Card not found' };
  },

  getDeckSettings: async (deckId: string) => {
    const allSettings = await db.getAll('anki_deck_settings') || [];
    const settings = allSettings.find((s: any) => s.deck_id === deckId);
    if (settings) return settings;
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
      await db.put('anki_deck_settings', { ...existing, ...settings, updated_at: new Date().toISOString() });
    } else {
      await db.put('anki_deck_settings', { id: generateId(), deck_id: deckId, ...settings, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    return { success: true };
  },

  getAllCards: async (deckId?: string) => {
    const allCards = await db.getAll('anki_cards') || [];
    const allNotes = await db.getAll('anki_notes') || [];
    const notesMap = new Map(allNotes.filter((n: any) => !n.deleted_at).map((n: any) => [n.id, n]));
    
    let validCards = allCards.filter((c: any) => !c.deleted_at);
    
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
      validCards = validCards.filter((c: any) => deckIds.has(c.deck_id));
    }
    
    const joinedCards = validCards.map((c: any) => {
       const note = notesMap.get(c.note_id);
       return note ? { ...note, ...c, id: c.id, note_id: note.id, deck_id: c.deck_id } : null;
    }).filter((c: any) => c !== null);
    
    return { success: true, cards: joinedCards };
  },

  deleteCardsBulk: async (cardIds: string[]) => {
    // Note: deleting a card in Anki deletes the NOTE.
    const allCards = await db.getAll('anki_cards') || [];
    const targetNotes = new Set<string>();
    
    for (const id of cardIds) {
      const card = allCards.find((c: any) => c.id === id);
      if (card && card.note_id) {
         targetNotes.add(card.note_id);
      }
    }
    
    for (const noteId of targetNotes) {
      const note = await db.get('anki_notes', noteId);
      if (note) {
        note.deleted_at = new Date().toISOString();
        note.updated_at = new Date().toISOString();
        await db.put('anki_notes', note);
      }
      for (const c of allCards) {
        if (c.note_id === noteId && !c.deleted_at) {
           c.deleted_at = new Date().toISOString();
           c.updated_at = new Date().toISOString();
           await db.put('anki_cards', c);
        }
      }
    }
    
    return { success: true };
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
      
      const allNotes = await db.getAllFromIndex('anki_notes', 'deck_id', deckId) || [];
      for (const note of allNotes) {
        note.deleted_at = new Date().toISOString();
        note.updated_at = new Date().toISOString();
        await db.put('anki_notes', note);
      }
      
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
    const allCards = await db.getAllFromIndex('anki_cards', 'deck_id', deckId) || [];
    for (const card of allCards) {
      card.srs_state = null; // wait, state, stability, etc.
      card.state = 0;
      card.reps = 0;
      card.lapses = 0;
      card.stability = 0;
      card.difficulty = 0;
      card.due_date = null;
      card.updated_at = new Date().toISOString();
      await db.put('anki_cards', card);
    }
    
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
  }
});

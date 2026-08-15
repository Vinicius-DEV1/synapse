export async function exportDeckRecursive(db: any, deckId: string) {
  const allDecks = (await db.getAll('anki_decks')) || [];
  const activeDecks = allDecks.filter((d: any) => !d.deleted_at);

  const deckIds = new Set<string>();
  deckIds.add(deckId);

  let added = true;
  while (added) {
    added = false;
    for (const d of activeDecks) {
      if (d.parent_id && deckIds.has(d.parent_id) && !deckIds.has(d.id)) {
        deckIds.add(d.id);
        added = true;
      }
    }
  }

  const exportedDecks = activeDecks.filter((d: any) => deckIds.has(d.id));

  const allNotes = (await db.getAll('anki_notes')) || [];
  const exportedNotes = allNotes.filter((n: any) => !n.deleted_at && deckIds.has(n.deck_id));
  const noteIds = new Set(exportedNotes.map((n: any) => n.id));

  const allCards = (await db.getAll('anki_cards')) || [];
  const exportedCards = allCards.filter((c: any) => !c.deleted_at && noteIds.has(c.note_id));

  const payload = {
    decks: exportedDecks,
    notes: exportedNotes,
    cards: exportedCards,
  };

  return { success: true, payload };
}

export async function importDeck(db: any, payload: any) {
  try {
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('Payload inválido');
    }

    const { decks = [], notes = [], cards = [] } = payload;

    if (!Array.isArray(decks) || !Array.isArray(notes) || !Array.isArray(cards)) {
      throw new Error('Formato corrompido: decks, notes ou cards não são listas válidas.');
    }

    const stats = {
      decksCreated: 0,
      decksUpdated: 0,
      decksIgnored: 0,
      notesCreated: 0,
      notesUpdated: 0,
      notesIgnored: 0,
      cardsCreated: 0,
      cardsUpdated: 0,
      cardsIgnored: 0,
    };

    const isIdentical = (a: any, b: any, ignoreKeys = ['updated_at', 'created_at', 'deleted_at']) => {
      const objA = { ...a };
      const objB = { ...b };
      ignoreKeys.forEach((k) => {
        delete objA[k];
        delete objB[k];
      });
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
        if (
          isIdentical(existing, c, [
            'updated_at',
            'created_at',
            'deleted_at',
            'last_reviewed',
            'state',
            'due',
            'stability',
            'difficulty',
          ])
        ) {
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
}

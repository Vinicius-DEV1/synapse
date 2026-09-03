import { collectDescendantDeckIds } from './utils/deck-tree';

export async function exportDeckRecursive(db: any, deckId: string) {
  const allDecks = (await db.getAll('anki_decks')) || [];
  const activeDecks = allDecks.filter((d: any) => !d.deleted_at);

  const deckIds = collectDescendantDeckIds(activeDecks, deckId);

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

function areRecordsEqual(
  a: Record<string, any>,
  b: Record<string, any>,
  ignoreKeys: string[] = ['updated_at', 'created_at', 'deleted_at']
): boolean {
  if (!a || !b) return a === b;
  const ignoreSet = new Set(ignoreKeys);
  const keysA = Object.keys(a).filter((k) => !ignoreSet.has(k));
  const keysB = new Set(Object.keys(b).filter((k) => !ignoreSet.has(k)));

  if (keysA.length !== keysB.size) return false;

  for (const key of keysA) {
    if (!keysB.has(key)) return false;
    const valA = a[key];
    const valB = b[key];

    if (valA === valB) continue;

    if (Array.isArray(valA) && Array.isArray(valB)) {
      if (valA.length !== valB.length) return false;
      if (JSON.stringify(valA) !== JSON.stringify(valB)) return false;
    } else if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null) {
      if (!areRecordsEqual(valA, valB, ignoreKeys)) return false;
    } else {
      return false;
    }
  }

  return true;
}

export async function importDeck(db: any, payload: any) {
  try {
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('Invalid import payload');
    }

    const { decks = [], notes = [], cards = [] } = payload;

    if (!Array.isArray(decks) || !Array.isArray(notes) || !Array.isArray(cards)) {
      throw new Error('Corrupted format: decks, notes or cards are not valid lists');
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

    const now = new Date().toISOString();
    const tx = db.transaction(['anki_decks', 'anki_notes', 'anki_cards'], 'readwrite');
    const storeDecks = tx.objectStore('anki_decks');
    const storeNotes = tx.objectStore('anki_notes');
    const storeCards = tx.objectStore('anki_cards');

    for (const d of decks) {
      if (!d.id) throw new Error('Deck without ID detected');
      const existing = await storeDecks.get(d.id);
      if (existing) {
        if (areRecordsEqual(existing, d)) {
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
      if (!n.id) throw new Error('Note without ID detected');
      const existing = await storeNotes.get(n.id);
      if (existing) {
        if (areRecordsEqual(existing, n)) {
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

    const cardIgnoreKeys = [
      'updated_at',
      'created_at',
      'deleted_at',
      'last_reviewed',
      'last_review',
      'state',
      'due',
      'due_date',
      'stability',
      'difficulty',
    ];

    for (const c of cards) {
      if (!c.id) throw new Error('Card without ID detected');
      const existing = await storeCards.get(c.id);
      if (existing) {
        if (areRecordsEqual(existing, c, cardIgnoreKeys)) {
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

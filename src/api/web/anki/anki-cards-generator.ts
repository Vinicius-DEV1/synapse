export async function generateCardsForNote(db: any, note: any, generateId: () => string) {
  let existingCards: any[] = [];
  try {
    if (typeof db.getAllFromIndex === 'function') {
      const indexed = await db.getAllFromIndex('anki_cards', 'note_id', note.id);
      if (Array.isArray(indexed)) {
        existingCards = indexed.filter((c: any) => !c.deleted_at);
      }
    }
  } catch {
    // Fallback if index does not exist
  }

  if (existingCards.length === 0) {
    const allCards = (await db.getAll('anki_cards')) || [];
    existingCards = allCards.filter((c: any) => c.note_id === note.id && !c.deleted_at);
  }

  let requiredOrds = [0];
  if (note.card_type === 'cloze' && typeof note.front === 'string') {
    const matches = note.front.match(/\{\{c(\d+)::.*?\}\}/g);
    if (matches && matches.length > 0) {
      const ords: number[] = [];
      for (const m of matches) {
        const subMatch = m.match(/c(\d+)::/);
        if (subMatch && subMatch[1]) {
          const num = parseInt(subMatch[1], 10);
          if (Number.isFinite(num) && num > 0) {
            ords.push(num - 1); // c1 -> ord 0
          }
        }
      }
      if (ords.length > 0) {
        requiredOrds = Array.from(new Set<number>(ords)).sort((a: number, b: number) => a - b);
      }
    }
  }

  const now = new Date().toISOString();
  const operations: Promise<any>[] = [];

  // Create missing cards
  for (const ord of requiredOrds) {
    if (!existingCards.some((c: any) => c.ord === ord)) {
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
        created_at: now,
        updated_at: now,
      };
      operations.push(db.put('anki_cards', newCard));
    }
  }

  // Soft-delete extra cards
  for (const card of existingCards) {
    if (!requiredOrds.includes(card.ord)) {
      const updatedCard = {
        ...card,
        deleted_at: now,
        updated_at: now,
      };
      operations.push(db.put('anki_cards', updatedCard));
    }
  }

  if (operations.length > 0) {
    await Promise.all(operations);
  }
}

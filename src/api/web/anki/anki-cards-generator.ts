export async function generateCardsForNote(db: any, note: any, generateId: () => string) {
  const allCards = (await db.getAll('anki_cards')) || [];
  const existingCards = allCards.filter((c: any) => c.note_id === note.id && !c.deleted_at);

  let requiredOrds = [0];
  if (note.card_type === 'cloze') {
    const matches = note.front.match(/\{\{c(\d+)::.*?\}\}/g);
    if (matches && matches.length > 0) {
      const ords: number[] = matches.map((m: string) => parseInt(m.match(/c(\d+)::/)![1], 10) - 1); // c1 -> ord 0
      requiredOrds = Array.from(new Set<number>(ords)).sort((a: number, b: number) => a - b);
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
        updated_at: new Date().toISOString(),
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

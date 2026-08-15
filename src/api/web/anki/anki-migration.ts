import { generateCardsForNote } from './anki-cards-generator';

export async function migrateToNotes(db: any, generateId: () => string) {
  const allCards = (await db.getAll('anki_cards')) || [];
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
        deleted_at: card.deleted_at,
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

      // Also if it's cloze with multiple cX, we need to generate other cards
      await generateCardsForNote(db, note, generateId);

      migratedCount++;
    }
  }
  return { success: true, migratedCount };
}

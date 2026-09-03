import { generateCardsForNote } from './anki-cards-generator';

export async function migrateToNotes(db: any, generateId: () => string) {
  const allCards = (await db.getAll('anki_cards')) || [];
  let migratedCount = 0;

  for (const card of allCards) {
    // If the card already has a note_id or is marked deleted, it is already migrated or deleted
    if (card.note_id || card.deleted_at || card.front === undefined) {
      continue;
    }

    const noteId = generateId();

    let newFront = card.front;
    if (card.card_type === 'cloze' && typeof newFront === 'string') {
      newFront = newFront.replace(/\{\{(?!c\d+::)(.*?)\}\}/g, '{{c1::$1}}');
    }

    const now = new Date().toISOString();
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
      created_at: card.created_at || now,
      updated_at: now,
      deleted_at: card.deleted_at || null,
    };

    await db.put('anki_notes', note);

    const updatedCard = { ...card };
    updatedCard.note_id = noteId;
    updatedCard.ord = 0;
    updatedCard.updated_at = now;

    delete updatedCard.front;
    delete updatedCard.back;
    delete updatedCard.extra_note;
    delete updatedCard.media_url;
    delete updatedCard.card_type;
    delete updatedCard.validation_mode;
    delete updatedCard.source_module;
    delete updatedCard.source_id;

    await db.put('anki_cards', updatedCard);

    // If it's cloze with multiple cX, generate other cards
    await generateCardsForNote(db, note, generateId);

    migratedCount++;
  }
  return { success: true, migratedCount };
}

import type { AnkiNoteRecord, AnkiCardRecord, AnkiCard } from '../../../../types/anki';

/**
 * Joins card records with their corresponding note records.
 * Note fields provide content (front, back, tags, etc.) while card fields provide SRS scheduling state.
 */
export function joinCardsWithNotes(
  cards: AnkiCardRecord[],
  notes: AnkiNoteRecord[]
): AnkiCard[] {
  const notesMap = new Map<string, AnkiNoteRecord>(
    notes
      .filter((n) => !n.deleted_at)
      .map((n) => [n.id, n])
  );

  const joined: AnkiCard[] = [];

  for (const card of cards) {
    if (card.deleted_at) continue;
    const note = notesMap.get(card.note_id);
    if (!note) continue;

    joined.push({
      ...note,
      ...card,
      id: card.id,
      note_id: note.id,
      deck_id: card.deck_id,
      ord: card.ord,
      state: card.state,
      due_date: card.due_date,
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      reps: card.reps,
      lapses: card.lapses,
      last_review: card.last_review,
      srs_state: card.srs_state || undefined,
      created_at: card.created_at || note.created_at,
      updated_at: card.updated_at || note.updated_at,
    });
  }

  return joined;
}

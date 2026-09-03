import type { AnkiDeckSettings } from '../../../types/anki';

export async function getDeckSettings(db: any, deckId: string): Promise<AnkiDeckSettings> {
  let settings: AnkiDeckSettings | undefined;

  try {
    if (typeof db.getAllFromIndex === 'function') {
      const indexed = await db.getAllFromIndex('anki_deck_settings', 'deck_id', deckId);
      if (Array.isArray(indexed) && indexed.length > 0) {
        settings = indexed[0];
      }
    }
  } catch {
    // Fallback if index does not exist
  }

  if (!settings) {
    const allSettings = (await db.getAll('anki_deck_settings')) || [];
    settings = allSettings.find((s: any) => s.deck_id === deckId);
  }

  if (settings) return settings;

  const now = new Date().toISOString();
  return {
    id: `default_${deckId}`,
    deck_id: deckId,
    new_limit: 20,
    review_limit: 200,
    learning_steps: '1m,10m',
    relearning_steps: '10m',
    fsrs_weights: null,
    created_at: now,
    updated_at: now,
  };
}

export async function updateDeckSettings(
  db: any,
  generateId: () => string,
  deckId: string,
  settings: Partial<AnkiDeckSettings>
) {
  let existing: AnkiDeckSettings | undefined;
  try {
    if (typeof db.getAllFromIndex === 'function') {
      const indexed = await db.getAllFromIndex('anki_deck_settings', 'deck_id', deckId);
      if (Array.isArray(indexed) && indexed.length > 0) {
        existing = indexed[0];
      }
    }
  } catch {
    // Fallback if index does not exist
  }

  if (!existing) {
    const allSettings = (await db.getAll('anki_deck_settings')) || [];
    existing = allSettings.find((s: any) => s.deck_id === deckId);
  }

  const now = new Date().toISOString();
  if (existing) {
    await db.put('anki_deck_settings', {
      ...existing,
      ...settings,
      updated_at: now,
    });
  } else {
    await db.put('anki_deck_settings', {
      id: generateId(),
      deck_id: deckId,
      new_limit: 20,
      review_limit: 200,
      learning_steps: '1m,10m',
      relearning_steps: '10m',
      fsrs_weights: null,
      ...settings,
      created_at: now,
      updated_at: now,
    });
  }
  return { success: true };
}

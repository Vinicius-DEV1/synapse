export async function getDeckSettings(db: any, deckId: string) {
  const allSettings = (await db.getAll('anki_deck_settings')) || [];
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
}

export async function updateDeckSettings(
  db: any,
  generateId: () => string,
  deckId: string,
  settings: any
) {
  const allSettings = (await db.getAll('anki_deck_settings')) || [];
  const existing = allSettings.find((s: any) => s.deck_id === deckId);

  if (existing) {
    await db.put('anki_deck_settings', {
      ...existing,
      ...settings,
      updated_at: new Date().toISOString(),
    });
  } else {
    await db.put('anki_deck_settings', {
      id: generateId(),
      deck_id: deckId,
      ...settings,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  return { success: true };
}

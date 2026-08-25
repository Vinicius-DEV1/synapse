import { sqliteGetAll, sqliteGetFirst, sqliteQuery } from './bridgeClient';

export const webviewAnkiApi = {
  async getDecks() {
    return await sqliteGetAll(`SELECT * FROM anki_decks ORDER BY name ASC`);
  },

  async createDeck(name: string, description?: string, parentId?: string) {
    const id = `deck_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    await sqliteQuery(
      `INSERT INTO anki_decks (id, name, description, parent_id, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, name, description || '', parentId || null, now]
    );
    return { id, name, description: description || '', parent_id: parentId || null, created_at: now };
  },

  async updateDeck(deckId: string, name: string, description?: string) {
    await sqliteQuery(
      `UPDATE anki_decks SET name = ?, description = ? WHERE id = ?`,
      [name, description || '', deckId]
    );
    return true;
  },

  async deleteDeck(deckId: string) {
    await sqliteQuery(`DELETE FROM anki_decks WHERE id = ?`, [deckId]);
    await sqliteQuery(`DELETE FROM anki_cards WHERE deck_id = ?`, [deckId]);
    return true;
  },

  async getAllCards(deckId?: string) {
    if (deckId) {
      return await sqliteGetAll(`SELECT * FROM anki_cards WHERE deck_id = ? AND deleted_at IS NULL`, [deckId]);
    }
    return await sqliteGetAll(`SELECT * FROM anki_cards WHERE deleted_at IS NULL`);
  },

  async getCard(cardId: string) {
    return await sqliteGetFirst(`SELECT * FROM anki_cards WHERE id = ?`, [cardId]);
  },

  async saveCard(cardData: any) {
    const id = cardData.id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    await sqliteQuery(
      `INSERT INTO anki_cards (id, deck_id, front, back, extra_note, tags, card_type, validation_mode, media_url, source_module, source_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        cardData.deck_id,
        cardData.front,
        cardData.back,
        cardData.extra_note || '',
        typeof cardData.tags === 'string' ? cardData.tags : JSON.stringify(cardData.tags || []),
        cardData.card_type || 'basic',
        cardData.validation_mode || 'standard',
        cardData.media_url || null,
        cardData.source_module || null,
        cardData.source_id || null,
        now,
        now,
      ]
    );
    return { id, ...cardData, created_at: now, updated_at: now };
  },

  async updateCard(cardId: string, data: any) {
    const now = new Date().toISOString();
    await sqliteQuery(
      `UPDATE anki_cards SET front = COALESCE(?, front), back = COALESCE(?, back), extra_note = COALESCE(?, extra_note), updated_at = ? WHERE id = ?`,
      [data.front, data.back, data.extra_note, now, cardId]
    );
    return true;
  },

  async deleteCard(cardId: string) {
    const now = new Date().toISOString();
    await sqliteQuery(`UPDATE anki_cards SET deleted_at = ?, updated_at = ? WHERE id = ?`, [now, now, cardId]);
    return true;
  },

  async getDeckSettings(deckId: string) {
    return await sqliteGetFirst(`SELECT * FROM anki_deck_settings WHERE deck_id = ?`, [deckId]);
  },

  async updateDeckSettings(deckId: string, settings: any) {
    const id = `settings_${deckId}`;
    const now = new Date().toISOString();
    await sqliteQuery(
      `INSERT OR REPLACE INTO anki_deck_settings (id, deck_id, new_limit, review_limit, learning_steps, relearning_steps, fsrs_weights, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        deckId,
        settings.new_limit || 20,
        settings.review_limit || 100,
        settings.learning_steps || '1m 10m',
        settings.relearning_steps || '10m',
        typeof settings.fsrs_weights === 'string' ? settings.fsrs_weights : JSON.stringify(settings.fsrs_weights || []),
        now,
      ]
    );
    return true;
  },
};

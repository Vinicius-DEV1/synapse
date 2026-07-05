import { ipcMain } from 'electron';
import { getDb } from '../db/connection';
import * as crypto from 'crypto';

export function registerAnkiHandlers() {
  ipcMain.handle('anki:get-decks', async () => {
    return new Promise((resolve) => {
      getDb().all('SELECT * FROM anki.anki_decks ORDER BY created_at DESC', (err, rows) => {
        if (err) return resolve({ success: false, error: err.message });
        if (rows.length === 0) {
          // Auto-create default deck
          const id = crypto.randomUUID();
          getDb().run(
            'INSERT INTO anki.anki_decks (id, name, description) VALUES (?, ?, ?)',
            [id, 'Vocabulário Geral', 'Baralho principal gerado automaticamente'],
            (insertErr) => {
              if (insertErr) return resolve({ success: false, error: insertErr.message });
              resolve({ success: true, decks: [{ id, name: 'Vocabulário Geral', description: 'Baralho principal gerado automaticamente', created_at: new Date().toISOString() }] });
            }
          );
        } else {
          resolve({ success: true, decks: rows });
        }
      });
    });
  });

  ipcMain.handle('anki:create-deck', async (_, name: string, description: string = '') => {
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      getDb().run(
        'INSERT INTO anki.anki_decks (id, name, description) VALUES (?, ?, ?)',
        [id, name, description],
        (err) => {
          if (err) return resolve({ success: false, error: err.message });
          resolve({ success: true, id });
        }
      );
    });
  });

  ipcMain.handle('anki:save-card', async (_, cardData: any) => {
    return new Promise((resolve) => {
      const id = crypto.randomUUID();
      const { deck_id, front, back, extra_note, source_module, source_id, media_url, card_type } = cardData;
      
      const db = getDb();
      db.run('BEGIN TRANSACTION');

      db.run(
        `INSERT INTO anki.anki_cards 
        (id, deck_id, front, back, extra_note, source_module, source_id, media_url, card_type) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, deck_id, front, back, extra_note, source_module, source_id, media_url, card_type],
        (err) => {
          if (err) {
            db.run('ROLLBACK');
            return resolve({ success: false, error: err.message });
          }
          
          // Initial SRS state (New card)
          const now = new Date().toISOString();
          db.run(
            `INSERT INTO anki.anki_srs_state 
            (card_id, due_date, stability, difficulty, state) 
            VALUES (?, ?, ?, ?, ?)`,
            [id, now, 0, 0, 0], // state 0 = New
            (err2) => {
              if (err2) {
                db.run('ROLLBACK');
                return resolve({ success: false, error: err2.message });
              }
              db.run('COMMIT');
              resolve({ success: true, id });
            }
          );
        }
      );
    });
  });

  ipcMain.handle('anki:get-due-cards', async (_, deckId: string) => {
    return new Promise((resolve) => {
      const now = new Date().toISOString();
      getDb().all(
        `SELECT c.*, s.state, s.due_date 
         FROM anki.anki_cards c
         JOIN anki.anki_srs_state s ON c.id = s.card_id
         WHERE c.deck_id = ? AND s.due_date <= ?
         ORDER BY s.due_date ASC`,
        [deckId, now],
        (err, rows) => {
          if (err) return resolve({ success: false, error: err.message });
          resolve({ success: true, cards: rows });
        }
      );
    });
  });

  ipcMain.handle('anki:review-card', async (_, cardId: string, rating: number) => {
    // 1=Again, 2=Hard, 3=Good, 4=Easy
    // Simple placeholder for FSRS logic (to be expanded later)
    return new Promise((resolve) => {
      const db = getDb();
      
      db.get('SELECT * FROM anki.anki_srs_state WHERE card_id = ?', [cardId], (err, stateRow: any) => {
        if (err || !stateRow) return resolve({ success: false, error: 'State not found' });
        
        let nextIntervalDays = 1;
        let newState = 2; // Review
        
        // Very basic SM-2/FSRS placeholder math for now
        if (rating === 1) {
            nextIntervalDays = 0; // Due immediately or 5 mins
            newState = 1; // Learning
        } else if (rating === 2) {
            nextIntervalDays = Math.max(1, stateRow.scheduled_days * 1.2);
        } else if (rating === 3) {
            nextIntervalDays = Math.max(1, stateRow.scheduled_days * 2.5);
        } else if (rating === 4) {
            nextIntervalDays = Math.max(4, stateRow.scheduled_days * 3.5);
        }

        const now = new Date();
        if (rating !== 1) {
           now.setDate(now.getDate() + nextIntervalDays);
        } else {
           now.setMinutes(now.getMinutes() + 5);
        }
        
        const due_date = now.toISOString();

        db.run('BEGIN TRANSACTION');
        db.run(
          'UPDATE anki.anki_srs_state SET due_date = ?, scheduled_days = ?, state = ?, reps = reps + 1 WHERE card_id = ?',
          [due_date, nextIntervalDays, newState, cardId],
          (err2) => {
             if (err2) { db.run('ROLLBACK'); return resolve({ success: false, error: err2.message }); }
             
             db.run(
               'INSERT INTO anki.anki_reviews (id, card_id, rating) VALUES (?, ?, ?)',
               [crypto.randomUUID(), cardId, rating],
               (err3) => {
                 if (err3) { db.run('ROLLBACK'); return resolve({ success: false, error: err3.message }); }
                 db.run('COMMIT');
                 resolve({ success: true });
               }
             );
          }
        );
      });
    });
  ipcMain.handle('anki:get-all-cards', async (_, deckId?: string) => {
    return new Promise((resolve) => {
      let query = 'SELECT * FROM anki.anki_cards';
      let params: any[] = [];
      if (deckId) {
        query += ' WHERE deck_id = ?';
        params.push(deckId);
      }
      query += ' ORDER BY created_at DESC';
      
      getDb().all(query, params, (err, rows) => {
        if (err) return resolve({ success: false, error: err.message });
        resolve({ success: true, cards: rows });
      });
    });
  });

  ipcMain.handle('anki:delete-card', async (_, cardId: string) => {
    return new Promise((resolve) => {
      const db = getDb();
      db.run('BEGIN TRANSACTION');
      // Delete from reviews and srs_state first due to relationships (though sqlite does it via CASCADE if configured, let's be safe)
      db.run('DELETE FROM anki.anki_reviews WHERE card_id = ?', [cardId], (err) => {
        if (err) { db.run('ROLLBACK'); return resolve({ success: false, error: err.message }); }
        db.run('DELETE FROM anki.anki_srs_state WHERE card_id = ?', [cardId], (err2) => {
          if (err2) { db.run('ROLLBACK'); return resolve({ success: false, error: err2.message }); }
          db.run('DELETE FROM anki.anki_cards WHERE id = ?', [cardId], (err3) => {
            if (err3) { db.run('ROLLBACK'); return resolve({ success: false, error: err3.message }); }
            db.run('COMMIT');
            resolve({ success: true });
          });
        });
      });
    });
  });

  ipcMain.handle('anki:delete-cards-bulk', async (_, cardIds: string[]) => {
    return new Promise((resolve) => {
      if (!cardIds || cardIds.length === 0) return resolve({ success: true });
      const db = getDb();
      db.run('BEGIN TRANSACTION');
      const placeholders = cardIds.map(() => '?').join(',');
      
      db.run(`DELETE FROM anki.anki_reviews WHERE card_id IN (${placeholders})`, cardIds, (err) => {
        if (err) { db.run('ROLLBACK'); return resolve({ success: false, error: err.message }); }
        db.run(`DELETE FROM anki.anki_srs_state WHERE card_id IN (${placeholders})`, cardIds, (err2) => {
          if (err2) { db.run('ROLLBACK'); return resolve({ success: false, error: err2.message }); }
          db.run(`DELETE FROM anki.anki_cards WHERE id IN (${placeholders})`, cardIds, (err3) => {
            if (err3) { db.run('ROLLBACK'); return resolve({ success: false, error: err3.message }); }
            db.run('COMMIT');
            resolve({ success: true });
          });
        });
      });
    });
  });

  ipcMain.handle('anki:update-card', async (_, cardId: string, data: any) => {
    return new Promise((resolve) => {
      const { front, back, extra_note, media_url } = data;
      getDb().run(
        'UPDATE anki.anki_cards SET front = ?, back = ?, extra_note = ?, media_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [front, back, extra_note || '', media_url || null, cardId],
        (err) => {
          if (err) return resolve({ success: false, error: err.message });
          resolve({ success: true });
        }
      );
    });
  });

  ipcMain.handle('anki:move-cards', async (_, cardIds: string[], newDeckId: string) => {
    return new Promise((resolve) => {
      if (!cardIds || cardIds.length === 0) return resolve({ success: true });
      const placeholders = cardIds.map(() => '?').join(',');
      getDb().run(
        `UPDATE anki.anki_cards SET deck_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
        [newDeckId, ...cardIds],
        (err) => {
          if (err) return resolve({ success: false, error: err.message });
          resolve({ success: true });
        }
      );
    });
  });

  ipcMain.handle('anki:update-deck', async (_, deckId: string, name: string, description: string) => {
    return new Promise((resolve) => {
      getDb().run(
        'UPDATE anki.anki_decks SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, description, deckId],
        (err) => {
          if (err) return resolve({ success: false, error: err.message });
          resolve({ success: true });
        }
      );
    });
  });

  ipcMain.handle('anki:delete-deck', async (_, deckId: string) => {
    return new Promise((resolve) => {
      const db = getDb();
      db.run('BEGIN TRANSACTION');
      // Delete all cards within this deck (this cascade deletes reviews and srs via logic, but for simplicity here we rely on standard DELETE or we can just delete cards directly)
      // Since we don't have CASCADE declared in SQLite (maybe), let's manually delete the linked data for the cards.
      db.all('SELECT id FROM anki.anki_cards WHERE deck_id = ?', [deckId], (err, rows) => {
        if (err) { db.run('ROLLBACK'); return resolve({ success: false, error: err.message }); }
        
        const cardIds = rows.map((r: any) => r.id);
        if (cardIds.length > 0) {
          const placeholders = cardIds.map(() => '?').join(',');
          db.run(`DELETE FROM anki.anki_reviews WHERE card_id IN (${placeholders})`, cardIds, (err2) => {
            if (err2) { db.run('ROLLBACK'); return resolve({ success: false, error: err2.message }); }
            db.run(`DELETE FROM anki.anki_srs_state WHERE card_id IN (${placeholders})`, cardIds, (err3) => {
              if (err3) { db.run('ROLLBACK'); return resolve({ success: false, error: err3.message }); }
              db.run('DELETE FROM anki.anki_cards WHERE deck_id = ?', [deckId], (err4) => {
                if (err4) { db.run('ROLLBACK'); return resolve({ success: false, error: err4.message }); }
                db.run('DELETE FROM anki.anki_decks WHERE id = ?', [deckId], (err5) => {
                  if (err5) { db.run('ROLLBACK'); return resolve({ success: false, error: err5.message }); }
                  db.run('COMMIT');
                  resolve({ success: true });
                });
              });
            });
          });
        } else {
          db.run('DELETE FROM anki.anki_decks WHERE id = ?', [deckId], (err5) => {
            if (err5) { db.run('ROLLBACK'); return resolve({ success: false, error: err5.message }); }
            db.run('COMMIT');
            resolve({ success: true });
          });
        }
      });
    });
  });
}

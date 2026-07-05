import { ipcMain } from 'electron';
import { getDb } from '../db/connection';
import * as crypto from 'crypto';

export function registerAnkiHandlers() {
  ipcMain.handle('anki:get-decks', async () => {
    return new Promise((resolve) => {
      getDb().all('SELECT * FROM anki.anki_decks ORDER BY created_at DESC', (err, rows) => {
        if (err) return resolve({ success: false, error: err.message });
        resolve({ success: true, decks: rows });
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
  });
}

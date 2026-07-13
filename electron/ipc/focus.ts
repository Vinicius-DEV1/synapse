import { ipcMain } from 'electron';
import { getDb } from '../db/connection';

export function setupFocusIpc() {
  ipcMain.handle('focus:get-sessions', async () => {
    return new Promise((resolve) => {
      getDb().all('SELECT * FROM focus.sessions ORDER BY created_at DESC', (err, rows) => {
        if (err) return resolve({ success: false, error: err.message });
        resolve({ success: true, sessions: rows });
      });
    });
  });

  ipcMain.handle('focus:create-session', async (_, session) => {
    return new Promise((resolve) => {
      getDb().run(
        `INSERT INTO focus.sessions (tag, description, target_time_minutes, status, justification, summary) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [session.tag, session.description, session.target_time_minutes, session.status, session.justification, session.summary],
        function(err) {
          if (err) return resolve({ success: false, error: err.message });
          resolve({ success: true, id: this.lastID });
        }
      );
    });
  });

  ipcMain.handle('focus:delete-sessions', async (_, options) => {
    return new Promise((resolve) => {
      if (options.type === 'specific') {
        getDb().run(`DELETE FROM focus.sessions WHERE id = ?`, [options.id], function(err) {
          if (err) return resolve({ success: false, error: err.message });
          resolve({ success: true });
        });
      } else {
        resolve({ success: false, error: 'Unknown delete type' });
      }
    });
  });

  ipcMain.handle('focus:get-alarms', async () => {
    return new Promise((resolve) => {
      getDb().all('SELECT * FROM focus.alarms ORDER BY time_str ASC', (err, rows) => {
        if (err) return resolve({ success: false, error: err.message });
        resolve({ success: true, alarms: rows });
      });
    });
  });

  ipcMain.handle('focus:create-alarm', async (_, alarm) => {
    return new Promise((resolve) => {
      getDb().run(
        `INSERT INTO focus.alarms (time_str, label, is_active) VALUES (?, ?, ?)`,
        [alarm.time_str, alarm.label, alarm.is_active ? 1 : 0],
        function(err) {
          if (err) return resolve({ success: false, error: err.message });
          resolve({ success: true, id: this.lastID });
        }
      );
    });
  });

  ipcMain.handle('focus:update-alarm', async (_, id, alarm) => {
    return new Promise((resolve) => {
      getDb().run(
        `UPDATE focus.alarms SET time_str = ?, label = ?, is_active = ? WHERE id = ?`,
        [alarm.time_str, alarm.label, alarm.is_active ? 1 : 0, id],
        function(err) {
          if (err) return resolve({ success: false, error: err.message });
          resolve({ success: true });
        }
      );
    });
  });

  ipcMain.handle('focus:delete-alarm', async (_, id) => {
    return new Promise((resolve) => {
      getDb().run(`DELETE FROM focus.alarms WHERE id = ?`, [id], function(err) {
        if (err) return resolve({ success: false, error: err.message });
        resolve({ success: true });
      });
    });
  });
}

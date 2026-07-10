import { ipcMain } from 'electron';
import { getDb } from '../db/connection';

export function registerCalendarHandlers() {
  ipcMain.handle('calendar:getEvents', async () => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.all("SELECT * FROM calendar_events WHERE deleted_at IS NULL", (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  });

  ipcMain.handle('calendar:createEvent', async (_, eventData: any) => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      const stmt = db.prepare(`
        INSERT INTO calendar_events (id, title, description, start_date, end_date, type, status, color, recurrence_rule, reminder_minutes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        [
          eventData.id,
          eventData.title,
          eventData.description || null,
          eventData.start_date,
          eventData.end_date,
          eventData.type || 'event',
          eventData.status || 'pending',
          eventData.color || '#4F46E5',
          eventData.recurrence_rule || null,
          eventData.reminder_minutes || null,
          new Date().toISOString(),
          new Date().toISOString()
        ],
        function (err: any) {
          if (err) reject(err);
          else resolve(eventData);
        }
      );
      stmt.finalize();
    });
  });

  ipcMain.handle('calendar:updateEvent', async (_, id: string, eventData: any) => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      
      const fields = [];
      const values = [];
      for (const [key, val] of Object.entries(eventData)) {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(val);
        }
      }
      fields.push(`updated_at = ?`);
      values.push(new Date().toISOString());
      values.push(id);

      db.run(`UPDATE calendar_events SET ${fields.join(', ')} WHERE id = ?`, values, function(err: any) {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  });

  ipcMain.handle('calendar:deleteEvent', async (_, id: string) => {
    return new Promise((resolve, reject) => {
      const db = getDb();
      db.run("UPDATE calendar_events SET deleted_at = ? WHERE id = ?", [new Date().toISOString(), id], function(err: any) {
        if (err) reject(err);
        else resolve(true);
      });
    });
  });
}

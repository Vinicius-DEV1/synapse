const sqlite3 = require('@journeyapps/sqlcipher');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'test_cipher.sqlite');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new sqlite3.Database(dbPath, () => {
  db.run("PRAGMA key = 'correct_password'", () => {
    db.run('CREATE TABLE t (id INTEGER)', () => {
      db.close(() => {
        
        // now open with wrong password
        const db2 = new sqlite3.Database(dbPath, () => {
          db2.run("PRAGMA key = 'wrong_password'", () => {
            db2.get('SELECT count(*) FROM sqlite_master', (err, row) => {
              console.log('Wrong password - Error:', err ? err.message : 'None', '| Row:', row);
              
              const db3 = new sqlite3.Database(dbPath, () => {
                db3.run("PRAGMA key = 'correct_password'", () => {
                  db3.get('SELECT count(*) FROM sqlite_master', (err2, row2) => {
                    console.log('Correct password - Error:', err2 ? err2.message : 'None', '| Row:', row2);
                  });
                });
              });
            });
          });
        });

      });
    });
  });
});

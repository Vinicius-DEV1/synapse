const sqlite3 = require('@journeyapps/sqlcipher');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'test_new_db.sqlite');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

const db = new sqlite3.Database(dbPath, () => {
  db.run("PRAGMA key = 'my_secret_password'", () => {
    db.run("CREATE TABLE test (id INTEGER)", () => {
      db.close(() => {
        // Test with WRONG password
        const db2 = new sqlite3.Database(dbPath, () => {
          db2.run("PRAGMA key = 'wrong_password'", () => {
            db2.get('SELECT count(*) FROM sqlite_master', (err) => {
               console.log("Wrong password test:", err ? err.message : "SUCCESS (Bug!)");
               
               // Test with CORRECT password
               const db3 = new sqlite3.Database(dbPath, () => {
                  db3.run("PRAGMA key = 'my_secret_password'", () => {
                     db3.get('SELECT count(*) FROM sqlite_master', (err2) => {
                        console.log("Correct password test:", err2 ? err2.message : "SUCCESS");
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

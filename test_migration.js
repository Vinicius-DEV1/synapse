const sqlite3 = require('@journeyapps/sqlcipher');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'test_mig.sqlite');
const tempEncPath = path.join(__dirname, 'test_mig_enc.sqlite');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
if (fs.existsSync(tempEncPath)) fs.unlinkSync(tempEncPath);

// Create unencrypted
const db = new sqlite3.Database(dbPath, () => {
  db.run("CREATE TABLE test (id INTEGER)", () => {
    db.close(() => {
      
      // Migrate
      const unencryptedDb = new sqlite3.Database(dbPath, () => {
        unencryptedDb.run(`ATTACH DATABASE '${tempEncPath.replace(/\\/g, '/')}' AS encrypted KEY 'my_pwd'`, (err) => {
          if (err) return console.error("Attach err:", err);
          unencryptedDb.run(`SELECT sqlcipher_export('encrypted')`, (err2) => {
            if (err2) return console.error("Export err:", err2);
            unencryptedDb.run(`DETACH DATABASE encrypted`, () => {
              unencryptedDb.close(() => {
                fs.unlinkSync(dbPath);
                fs.renameSync(tempEncPath, dbPath);
                
                // Test with WRONG password
                const db2 = new sqlite3.Database(dbPath, () => {
                  db2.run("PRAGMA key = 'wrong'", () => {
                    db2.get("SELECT count(*) FROM sqlite_master", (err3) => {
                      console.log("Wrong pwd test:", err3 ? err3.message : "SUCCESS (BUG)");
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
});

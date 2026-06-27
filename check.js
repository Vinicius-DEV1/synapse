const sqlite3 = require('@journeyapps/sqlcipher');
const db = new sqlite3.Database(process.env.APPDATA + '/caderno/db.sqlite');
db.serialize(() => {
  // We can't query without knowing the password, but wait, the password is 'test' or whatever they used.
  // Actually, I can just write a script that bypasses the pragma key if the user's password is not known?
  // No, sqlcipher requires the password!
});

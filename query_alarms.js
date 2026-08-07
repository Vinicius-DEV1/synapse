const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('C:/Users/vinic/Downloads/meus apps/caderno/src-tauri/target/release/data/caderno.sqlite');
console.log(db.prepare("SELECT sql FROM sqlite_master WHERE name = 'alarms'").get());

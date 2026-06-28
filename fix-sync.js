const fs = require('fs');
let content = fs.readFileSync('src/services/sync.ts', 'utf8');

const t1 =               if (typeof window !== 'undefined' && (window as any).api?.log) {
                (window as any).api.log(\[PULL] Doc \. localTime=\, cloudTime=\\);
              };

const r1 = t1 + 

              if (parsed.deleted_at) {
                if (typeof window !== 'undefined' && (window as any).api?.log) {
                  (window as any).api.log(\[PULL DELETED] Doc \ deleted from cloud. Hard deleting locally.\);
                }
                if (window.api?.sync?.deleteRow) {
                  await window.api.sync.deleteRow(table, docSnap.id);
                }
                continue;
              };

content = content.replace(t1, r1);

const t2 =                     if (localRow.deleted_at !== undefined) rowToUpsert.deleted_at = localRow.deleted_at;
                  };
const r2 =                   };
content = content.replace(t2, r2);

const t3 = } else if (localTime > cloudTime) {
                // Se não tiver CRDT e o local for mais novo, Last Write Wins!
                // Ignoramos o pull para não sobrescrever nossa edição.
                if (typeof window !== 'undefined' && (window as any).api?.log) {;
const r3 = } else if (localTime > cloudTime) {
                if (parsed.deleted_at && !localRow?.deleted_at) {
                    Object.assign(rowToUpsert, localRow);
                    rowToUpsert.deleted_at = parsed.deleted_at;
                } else {
                    if (typeof window !== 'undefined' && (window as any).api?.log) {;

content = content.replace(t3, r3);
fs.writeFileSync('src/services/sync.ts', content, 'utf8');
console.log('Done!');
const fs = require('fs');
const path = require('path');
const file = path.join('c:/Users/vinic/Downloads/meus apps/caderno/src/services/gemini.ts');
let content = fs.readFileSync(file, 'utf8');

// Update Card Generation
content = content.replace(
  /const cleanJson = responseText\.replace\(\/```json\/g, ''\)\.replace\(\/```\/g, ''\)\.trim\(\);\r?\n\s*return JSON\.parse\(cleanJson\);/,
  `const cleanJson = responseText.replace(/\\`\\`\\`json/g, '').replace(/\\`\\`\\`/g, '').trim();
        let parsed = JSON.parse(cleanJson);
        
        // POST-PROCESSAMENTO PROGRAMÁTICO (Trava de segurança extra para tags)
        if (Array.isArray(parsed) && contextData) {
          const rootDeckName = (contextData.deck_name || '').toLowerCase();
          const subdecksMap = new Map();
          if (Array.isArray(contextData.subdecks)) {
            contextData.subdecks.forEach((s: any) => subdecksMap.set(s.id, (s.name || '').toLowerCase()));
          }
          
          parsed = parsed.map(card => {
            if (Array.isArray(card.tags)) {
              const targetDeckName = card.suggested_deck_id ? subdecksMap.get(card.suggested_deck_id) : rootDeckName;
              card.tags = card.tags.filter((t: string) => {
                const lowerT = t.toLowerCase();
                return lowerT !== rootDeckName && (!targetDeckName || lowerT !== targetDeckName);
              });
            }
            return card;
          });
        }
        
        return parsed;`
);

// Update Chat Analysis
content = content.replace(
  /const parsed = JSON\.parse\(cleanedText\);\r?\n\s*if \(response\.usage && typeof parsed === 'object'\) \{\r?\n\s*parsed\._usage = response\.usage;\r?\n\s*\}\r?\n\s*return parsed;/,
  `const parsed = JSON.parse(cleanedText);
      
      // POST-PROCESSAMENTO PROGRAMÁTICO (Trava de segurança extra para tags)
      if (typeof parsed === 'object' && parsed.actions && Array.isArray(parsed.actions) && contextData) {
        const rootDeckName = (contextData.deck_name || '').toLowerCase();
        const subdecksMap = new Map();
        if (Array.isArray(contextData.subdecks)) {
          contextData.subdecks.forEach((s: any) => subdecksMap.set(s.id, (s.name || '').toLowerCase()));
        }
        
        parsed.actions.forEach((action: any) => {
          if (action.type === 'create' && Array.isArray(action.cards)) {
            action.cards.forEach((card: any) => {
              if (Array.isArray(card.tags)) {
                const targetDeckName = card.suggested_deck_id ? subdecksMap.get(card.suggested_deck_id) : rootDeckName;
                card.tags = card.tags.filter((t: string) => {
                  const lowerT = t.toLowerCase();
                  return lowerT !== rootDeckName && (!targetDeckName || lowerT !== targetDeckName);
                });
              }
            });
          } else if (action.type === 'edit' && Array.isArray(action.new_tags)) {
            action.new_tags = action.new_tags.filter((t: string) => {
              const lowerT = t.toLowerCase();
              if (lowerT === rootDeckName) return false;
              for (let subName of subdecksMap.values()) {
                if (lowerT === subName) return false;
              }
              return true;
            });
          }
        });
      }

      if (response.usage && typeof parsed === 'object') {
         parsed._usage = response.usage;
      }
      return parsed;`
);

fs.writeFileSync(file, content);

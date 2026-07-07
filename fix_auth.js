const fs = require('fs');
let code = fs.readFileSync('electron/ipc/auth.ts', 'utf8');

code = code.split('const anki = row.anki_key_enc ? decryptModuleKey(row.anki_key_enc, password) : notes;').join('const anki = row.anki_key_enc ? decryptModuleKey(row.anki_key_enc, password) : notes;\n            const focus = row.focus_key_enc ? decryptModuleKey(row.focus_key_enc, password) : notes;');
code = code.split('anki: anki || undefined').join('anki: anki || undefined,\n              focus: focus || undefined');

code = code.split('culture_key_enc, anki_key_enc) VALUES').join('culture_key_enc, anki_key_enc, focus_key_enc) VALUES');
code = code.split('?, ?, ?, ?, ?, ?, ?').join('?, ?, ?, ?, ?, ?, ?, ?');
code = code.split('notEnc, notEnc, notEnc]').join('notEnc, notEnc, notEnc, notEnc]');
code = code.split('culture: notKey, anki: notKey').join('culture: notKey, anki: notKey, focus: notKey');
code = code.split('keys.culture || keys.notes, anki: keys.anki || keys.notes').join('keys.culture || keys.notes, anki: keys.anki || keys.notes, focus: keys.focus || keys.notes');
code = code.split('culEnc, ankiEnc').join('culEnc, ankiEnc, focusEnc');
code = code.split('anki_key_enc TEXT)').join('anki_key_enc TEXT, focus_key_enc TEXT)');
code = code.split('anki_key_enc = ?').join('anki_key_enc = ?, focus_key_enc = ?');

code = code.split('const ankiEnc = currentUnlockedKeys.anki ? encryptModuleKey(currentUnlockedKeys.anki, newPassword) : null;').join('const ankiEnc = currentUnlockedKeys.anki ? encryptModuleKey(currentUnlockedKeys.anki, newPassword) : null;\n      const focusEnc = currentUnlockedKeys.focus ? encryptModuleKey(currentUnlockedKeys.focus, newPassword) : null;');
code = code.split('const ankiEnc = keys.anki ? encryptModuleKey(keys.anki, password) : notEnc;').join('const ankiEnc = keys.anki ? encryptModuleKey(keys.anki, password) : notEnc;\n        const focusEnc = keys.focus ? encryptModuleKey(keys.focus, password) : notEnc;');

code = code.split('const ankiEnc = modulesToUnlock.includes(\'anki\') && currentUnlockedKeys.anki ? encryptModuleKey(currentUnlockedKeys.anki, newPassword) : null;').join('const ankiEnc = modulesToUnlock.includes(\'anki\') && currentUnlockedKeys.anki ? encryptModuleKey(currentUnlockedKeys.anki, newPassword) : null;\n          const focusEnc = modulesToUnlock.includes(\'focus\') && currentUnlockedKeys.focus ? encryptModuleKey(currentUnlockedKeys.focus, newPassword) : null;');
code = code.split('const ankiKey = allowedModules.includes(\'anki\') ? currentUnlockedKeys.anki : null;').join('const ankiKey = allowedModules.includes(\'anki\') ? currentUnlockedKeys.anki : null;\n    const focusKey = allowedModules.includes(\'focus\') ? currentUnlockedKeys.focus : null;');
code = code.split('const ankiEnc = ankiKey ? encryptModuleKey(ankiKey, visitorPassword) : null;').join('const ankiEnc = ankiKey ? encryptModuleKey(ankiKey, visitorPassword) : null;\n    const focusEnc = focusKey ? encryptModuleKey(focusKey, visitorPassword) : null;');

code = code.split('r.anki_key_enc ? \'anki\' : null').join('r.anki_key_enc ? \'anki\' : null,\n            r.focus_key_enc ? \'focus\' : null');

fs.writeFileSync('electron/ipc/auth.ts', code);

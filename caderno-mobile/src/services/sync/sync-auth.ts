import { db } from '../firebase';
import { decryptText, importHexKey } from '../crypto';
import { doc, getDoc } from 'firebase/firestore';

export async function verifyCloudMasterPassword(masterKeyHex: string): Promise<{ isValid: boolean; isNew: boolean; error?: 'offline' | 'timeout' | 'invalid' }> {
  try {
    console.log("[FIREBASE] 🌐 Conectando e buscando 'config/auth_validator'...");
    const docRef = doc(db, 'config', 'auth_validator');
    
    const docSnap = await Promise.race([
      getDoc(docRef),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 25000))
    ]);
    
    if (!docSnap) {
      console.warn("[FIREBASE] ⏳ Timeout ao buscar auth_validator (25s esgotados).");
      return { isValid: false, isNew: false, error: 'timeout' };
    }
    
    console.log("[FIREBASE] 📦 auth_validator recebido. Existe?", docSnap.exists());

    if (!docSnap.exists() || !docSnap.data().encryptedData) {
      console.log("[FIREBASE] 🆕 Documento não existe ou sem encryptedData -> Novo banco.");
      return { isValid: true, isNew: true };
    }
    
    try {
      console.log("[FIREBASE] 🔓 Descriptografando auth_validator...");
      const decryptedJson = await decryptText(docSnap.data().encryptedData, masterKeyHex);
      const parsed = JSON.parse(decryptedJson);
      console.log("[FIREBASE] 📄 Resultado:", JSON.stringify(parsed));

      if (parsed.validator === 'CADERNO_VALIDO') {
        console.log("[FIREBASE] ✅ Senha Mestra Validada com Sucesso!");
        return { isValid: true, isNew: false };
      }
    } catch (e: any) {
      console.warn("[FIREBASE] ❌ Falha ao decifrar auth_validator:", e?.message || e);
    }

    return { isValid: false, isNew: false, error: 'invalid' };
  } catch (err: any) {
    console.error("[FIREBASE] ❌ Erro de conexão:", err?.message || err);
    return { isValid: false, isNew: false, error: 'timeout' };
  }
}

export async function pullModularKeysFromCloud(masterKeyHex: string): Promise<Record<string, string> | null> {
  try {
    console.log("[FIREBASE] 🔑 Buscando chaves modulares 'config/module_keys'...");
    const docSnap = await Promise.race([
      getDoc(doc(db, 'config', 'module_keys')),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000))
    ]);
    
    const resultKeys: Record<string, string> = {
      core: masterKeyHex,
      notes: masterKeyHex,
      library: masterKeyHex,
    };

    if (docSnap && docSnap.exists() && docSnap.data().encryptedData) {
      try {
        console.log("[FIREBASE] 🔓 Descriptografando module_keys...");
        const decryptedJson = await decryptText(docSnap.data().encryptedData, masterKeyHex);
        const hexMap: Record<string, string> = JSON.parse(decryptedJson);
        console.log("[FIREBASE] 🔑 Módulos encontrados:", Object.keys(hexMap));
        for (const [module, hex] of Object.entries(hexMap)) {
          if (hex) {
            resultKeys[module] = await importHexKey(hex);
          }
        }
      } catch (err: any) {
        console.warn("[FIREBASE] Não foi possível decifrar chaves modulares:", err?.message);
      }
    }
    console.log("[FIREBASE] ✅ Chaves prontas para módulos:", Object.keys(resultKeys));
    return resultKeys;
  } catch (err: any) {
    console.error("[FIREBASE] Erro ao baixar chaves modulares:", err?.message || err);
    return null;
  }
}

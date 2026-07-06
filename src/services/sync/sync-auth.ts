import { db } from '../firebase';
import { encryptText, decryptText, deriveMasterKey, deriveLegacyMasterKey } from '../crypto';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function verifyCloudMasterPassword(password: string): Promise<{ isValid: boolean; isNew: boolean; isLegacy: boolean; legacyKey?: CryptoKey }> {
  try {
    const masterKey = await deriveMasterKey(password);
    
    const docRef = doc(db, 'config', 'auth_validator');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists() || !docSnap.data().encryptedData) {
      return { isValid: true, isNew: true, isLegacy: false };
    }
    
    // Tenta primeiro com a chave atual de 600k iterations
    try {
      const decryptedJson = await decryptText(docSnap.data().encryptedData, masterKey);
      const parsed = JSON.parse(decryptedJson);
      if (parsed.validator === 'CADERNO_VALIDO') {
        return { isValid: true, isNew: false, isLegacy: false };
      }
    } catch {
      // Falha ao descriptografar com a atual. Tenta a legacy.
    }

    // Fallback para 100k iterations (Migração de AppSec)
    try {
      const legacyKey = await deriveLegacyMasterKey(password);
      const decryptedJson = await decryptText(docSnap.data().encryptedData, legacyKey);
      const parsed = JSON.parse(decryptedJson);
      if (parsed.validator === 'CADERNO_VALIDO') {
        return { isValid: true, isNew: false, isLegacy: true, legacyKey };
      }
    } catch {
      // Falha com a legacy
    }

    return { isValid: false, isNew: false, isLegacy: false };
  } catch {
    return { isValid: false, isNew: false, isLegacy: false };
  }
}

export async function initializeCloudValidator(masterKey: CryptoKey): Promise<void> {
  const payload = JSON.stringify({ validator: 'CADERNO_VALIDO' });
  const encryptedData = await encryptText(payload, masterKey);
  await setDoc(doc(db, 'config', 'auth_validator'), {
    encryptedData,
    updatedAt: new Date().toISOString()
  });
}

export async function pushModularKeysToCloud(keys: Record<string, string>, masterKey: CryptoKey): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const docRef = doc(db, 'config', 'module_keys');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && docSnap.data().encryptedData) {
      console.error("🔒 ALERTA DE SEGURANÇA: Tentativa de sobrescrever chaves de criptografia existentes foi bloqueada.");
      return;
    }

    const payload = JSON.stringify(keys);
    const encryptedData = await encryptText(payload, masterKey);
    await setDoc(docRef, {
      encryptedData,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error("Erro ao subir chaves modulares", err);
  }
}

export async function pullModularKeysFromCloud(masterKey: CryptoKey, legacyKey?: CryptoKey): Promise<Record<string, string> | null> {
  if (!navigator.onLine) return null;
  try {
    const docSnap = await getDoc(doc(db, 'config', 'module_keys'));
    if (docSnap.exists() && docSnap.data().encryptedData) {
      try {
        const decryptedJson = await decryptText(docSnap.data().encryptedData, masterKey);
        return JSON.parse(decryptedJson);
      } catch (err) {
        if (legacyKey) {
          try {
            const decryptedLegacy = await decryptText(docSnap.data().encryptedData, legacyKey);
            return JSON.parse(decryptedLegacy);
          } catch (legacyErr) {
            console.error("Erro ao decifrar chaves com legacyKey:", legacyErr);
          }
        }
        console.warn("Nao foi possivel decifrar as chaves modulares da nuvem. Usando chaves locais.");
        return null;
      }
    }
  } catch (err) {
    console.error("Erro ao baixar chaves modulares", err);
  }
  return null;
}

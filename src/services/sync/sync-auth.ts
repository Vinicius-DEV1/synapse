import { db } from '../firebase';
import { encryptText, decryptText, deriveMasterKey } from '../crypto';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { logFirebaseOp } from './sync-monitor';

export async function verifyCloudMasterPassword(password: string): Promise<{ isValid: boolean; isNew: boolean }> {
  try {
    const masterKey = await deriveMasterKey(password);
    
    const docRef = doc(db, 'config', 'auth_validator');
    const docSnap = await getDoc(docRef);
    logFirebaseOp('read', 1);
    
    if (!docSnap.exists() || !docSnap.data().encryptedData) {
      return { isValid: true, isNew: true };
    }
    
    try {
      const decryptedJson = await decryptText(docSnap.data().encryptedData, masterKey);
      const parsed = JSON.parse(decryptedJson);
      if (parsed.validator === 'CADERNO_VALIDO') {
        return { isValid: true, isNew: false };
      }
    } catch {
      // Falha ao descriptografar
    }

    return { isValid: false, isNew: false };
  } catch {
    return { isValid: false, isNew: false };
  }
}

// --- ANTI-BRUTE FORCE / SECURITY LOCK ---

export interface SecurityLock {
  failedAttempts: number;
  lastFailedAt: number;
}

export async function getSecurityLock(): Promise<SecurityLock> {
  let failedAttempts = 0;
  let lastFailedAt = 0;

  // 1. Tentar ler da nuvem (mais forte)
  if (navigator.onLine) {
    try {
      const docRef = doc(db, 'config', 'security_lock');
      const docSnap = await getDoc(docRef);
      logFirebaseOp('read', 1);
      if (docSnap.exists()) {
        const data = docSnap.data();
        failedAttempts = data.failedAttempts || 0;
        lastFailedAt = data.lastFailedAt || 0;
      }
    } catch {
      // Ignora erro de leitura
    }
  }

  // 2. Tentar ler do local (fallback / tauri)
  try {
    const localLockStr = localStorage.getItem('caderno_security_lock');
    if (localLockStr) {
      const localLock = JSON.parse(localLockStr);
      // Se o local for mais recente ou mais restritivo, usa ele
      if (localLock.lastFailedAt > lastFailedAt || localLock.failedAttempts > failedAttempts) {
        failedAttempts = localLock.failedAttempts;
        lastFailedAt = localLock.lastFailedAt;
      }
    }
  } catch {}

  return { failedAttempts, lastFailedAt };
}

export async function recordFailedAttempt(): Promise<SecurityLock> {
  const currentLock = await getSecurityLock();
  const newLock: SecurityLock = {
    failedAttempts: currentLock.failedAttempts + 1,
    lastFailedAt: Date.now()
  };

  // Salvar Localmente
  localStorage.setItem('caderno_security_lock', JSON.stringify(newLock));

  // Salvar na Nuvem
  if (navigator.onLine) {
    try {
      await setDoc(doc(db, 'config', 'security_lock'), newLock, { merge: true });
      logFirebaseOp('write', 1);
    } catch {
      // Ignorar erro de escrita
    }
  }

  return newLock;
}

export async function clearFailedAttempts(): Promise<void> {
  localStorage.removeItem('caderno_security_lock');
  if (navigator.onLine) {
    try {
      await setDoc(doc(db, 'config', 'security_lock'), { failedAttempts: 0, lastFailedAt: 0 }, { merge: true });
      logFirebaseOp('write', 1);
    } catch {}
  }
}

// --- FIM DA SESSÃO DE SEGURANÇA ---

export async function initializeCloudValidator(masterKey: CryptoKey): Promise<void> {
  const payload = JSON.stringify({ validator: 'CADERNO_VALIDO' });
  const encryptedData = await encryptText(payload, masterKey);
  await setDoc(doc(db, 'config', 'auth_validator'), {
    encryptedData,
    updatedAt: new Date().toISOString()
  });
  logFirebaseOp('write', 1);
}

export async function pushModularKeysToCloud(keys: Record<string, string>, masterKey: CryptoKey): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const docRef = doc(db, 'config', 'module_keys');
    const docSnap = await getDoc(docRef);
    logFirebaseOp('read', 1);
    
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
    logFirebaseOp('write', 1);
  } catch (err) {
    console.error("Erro ao subir chaves modulares", err);
  }
}

export async function pullModularKeysFromCloud(masterKey: CryptoKey): Promise<Record<string, string> | null> {
  if (!navigator.onLine) return null;
  try {
    const docSnap = await getDoc(doc(db, 'config', 'module_keys'));
    logFirebaseOp('read', 1);
    if (docSnap.exists() && docSnap.data().encryptedData) {
      try {
        const decryptedJson = await decryptText(docSnap.data().encryptedData, masterKey);
        return JSON.parse(decryptedJson);
      } catch (err) {
        console.warn("Nao foi possivel decifrar as chaves modulares da nuvem. Usando chaves locais.");
        return null;
      }
    }
  } catch (err) {
    console.error("Erro ao baixar chaves modulares", err);
  }
  return null;
}

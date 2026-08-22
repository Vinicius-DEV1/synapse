import { db } from '../firebase';
import { encryptText, decryptText, deriveMasterKey } from '../crypto';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { logFirebaseOp } from './sync-monitor';

export async function verifyCloudMasterPassword(password: string): Promise<{ isValid: boolean; isNew: boolean; error?: 'offline' | 'timeout' | 'invalid' }> {
  try {
    const masterKey = await deriveMasterKey(password);
    
    if (!navigator.onLine) {
      return { isValid: false, isNew: false, error: 'offline' };
    }
    
    const docRef = doc(db, 'config', 'auth_validator');
    
    // 5-second timeout to avoid blocking login indefinitely
    const docSnap = await Promise.race([
      getDoc(docRef),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
    ]);
    
    if (!docSnap) {
      console.warn("⏳ Timeout ao verificar senha na nuvem. Firebase demorou muito.");
      return { isValid: false, isNew: false, error: 'timeout' };
    }

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

    return { isValid: false, isNew: false, error: 'invalid' };
  } catch {
    // Firebase connection failure (e.g. CORS on tauri://localhost) — treat as timeout, not invalid password
    return { isValid: false, isNew: false, error: 'timeout' };
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

  // 1. Attempt reading from cloud
  if (navigator.onLine) {
    try {
      const docRef = doc(db, 'config', 'security_lock');
      const docSnap = await Promise.race([
        getDoc(docRef),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))
      ]);
      
      if (docSnap) {
        logFirebaseOp('read', 1);
        if (docSnap.exists()) {
          const data = docSnap.data();
          failedAttempts = data.failedAttempts || 0;
          lastFailedAt = data.lastFailedAt || 0;
        }
      }
    } catch {
      // Ignore read errors
    }
  }

  // 2. Fallback: Read from local storage
  try {
    const localLockStr = localStorage.getItem('caderno_security_lock');
    if (localLockStr) {
      const localLock = JSON.parse(localLockStr);
      // If local is more recent, use local values
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

  // Persist locally
  localStorage.setItem('caderno_security_lock', JSON.stringify(newLock));

  // Salvar na Nuvem
  if (navigator.onLine) {
    try {
      await Promise.race([
        setDoc(doc(db, 'config', 'security_lock'), newLock, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
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
      await Promise.race([
        setDoc(doc(db, 'config', 'security_lock'), { failedAttempts: 0, lastFailedAt: 0 }, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
      ]);
      logFirebaseOp('write', 1);
    } catch {}
  }
}

// --- FIM DA SESSÃO DE SEGURANÇA ---

export async function initializeCloudValidator(masterKey: CryptoKey): Promise<void> {
  const payload = JSON.stringify({ validator: 'CADERNO_VALIDO' });
  const encryptedData = await encryptText(payload, masterKey);
  try {
    await Promise.race([
      setDoc(doc(db, 'config', 'auth_validator'), {
        encryptedData,
        updatedAt: new Date().toISOString()
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
    ]);
    logFirebaseOp('write', 1);
  } catch (err) {
    console.error("Timeout ou erro ao inicializar validator", err);
  }
}

export async function pushModularKeysToCloud(keys: Record<string, string>, masterKey: CryptoKey): Promise<void> {
  if (!navigator.onLine) return;
  try {
    const docRef = doc(db, 'config', 'module_keys');
    const docSnap = await Promise.race([
      getDoc(docRef),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
    ]);
    
    if (!docSnap) {
      console.warn("⏳ Timeout ao ler chaves modulares para push.");
      return;
    }
    
    logFirebaseOp('read', 1);
    
    if (docSnap.exists() && docSnap.data().encryptedData) {
      console.error("🔒 ALERTA DE SEGURANÇA: Tentativa de sobrescrever chaves de criptografia existentes foi bloqueada.");
      return;
    }

    const payload = JSON.stringify(keys);
    const encryptedData = await encryptText(payload, masterKey);
    await Promise.race([
      setDoc(docRef, {
        encryptedData,
        updatedAt: serverTimestamp()
      }, { merge: true }),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout write")), 5000))
    ]);
    logFirebaseOp('write', 1);
  } catch (err) {
    console.error("Erro ao subir chaves modulares", err);
  }
}

export async function pullModularKeysFromCloud(masterKey: CryptoKey): Promise<Record<string, string> | null> {
  if (!navigator.onLine) return null;
  try {
    const docSnap = await Promise.race([
      getDoc(doc(db, 'config', 'module_keys')),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
    ]);
    
    if (!docSnap) {
      console.warn("⏳ Timeout ao baixar chaves modulares. Usando chaves locais.");
      return null;
    }
    
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
  } catch (err: any) {
    console.error("Erro ao baixar chaves modulares", err);
    if (err.message === "FIREBASE_TIMEOUT") {
      throw err;
    }
  }
  return null;
}

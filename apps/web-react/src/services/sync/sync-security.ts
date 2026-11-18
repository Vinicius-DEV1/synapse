import { getDoc, setDoc } from 'firebase/firestore';
import { getErrorMessage } from '../../utils/error';
import { logFirebaseOp } from './sync-monitor';
import { getSecurityLockStorageKey, getUserConfigRef } from './user-config';

export interface SecurityLock {
  failedAttempts: number;
  lastFailedAt: number;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('FIREBASE_TIMEOUT')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export async function getSecurityLock(): Promise<SecurityLock> {
  let failedAttempts = 0;
  let lastFailedAt = 0;

  if (navigator.onLine) {
    try {
      const docRef = getUserConfigRef('security_lock');
      if (docRef) {
        const docSnap = await withTimeout(getDoc(docRef), 2000);
        logFirebaseOp('read', 1);
        if (docSnap.exists()) {
          const data: unknown = docSnap.data();
          if (isSecurityLock(data)) {
            failedAttempts = data.failedAttempts;
            lastFailedAt = data.lastFailedAt;
          }
        }
      }
    } catch (lockReadError: unknown) {
      console.debug('[SyncSecurity] Failed to read cloud security lock:', getErrorMessage(lockReadError));
    }
  }

  try {
    const localLockString = localStorage.getItem(getSecurityLockStorageKey());
    if (localLockString) {
      const parsed: unknown = JSON.parse(localLockString);
      if (isSecurityLock(parsed) &&
          (parsed.lastFailedAt > lastFailedAt || parsed.failedAttempts > failedAttempts)) {
        failedAttempts = parsed.failedAttempts;
        lastFailedAt = parsed.lastFailedAt;
      }
    }
  } catch (localLockError: unknown) {
    console.debug('[SyncSecurity] Failed to parse local security lock:', getErrorMessage(localLockError));
  }

  return { failedAttempts, lastFailedAt };
}

export async function recordFailedAttempt(): Promise<SecurityLock> {
  const currentLock = await getSecurityLock();
  const newLock: SecurityLock = {
    failedAttempts: currentLock.failedAttempts + 1,
    lastFailedAt: Date.now(),
  };
  localStorage.setItem(getSecurityLockStorageKey(), JSON.stringify(newLock));

  if (navigator.onLine) {
    try {
      const lockRef = getUserConfigRef('security_lock');
      if (lockRef) {
        await withTimeout(setDoc(lockRef, newLock, { merge: true }), 2000);
        logFirebaseOp('write', 1);
      }
    } catch (cloudWriteError: unknown) {
      console.debug('[SyncSecurity] Failed to persist security lock:', getErrorMessage(cloudWriteError));
    }
  }

  return newLock;
}

export async function clearFailedAttempts(): Promise<void> {
  localStorage.removeItem(getSecurityLockStorageKey());
  if (!navigator.onLine) return;

  try {
    const lockRef = getUserConfigRef('security_lock');
    if (!lockRef) return;
    await withTimeout(setDoc(lockRef, { failedAttempts: 0, lastFailedAt: 0 }, { merge: true }), 2000);
    logFirebaseOp('write', 1);
  } catch (clearCloudError: unknown) {
    console.debug('[SyncSecurity] Failed to clear cloud security lock:', getErrorMessage(clearCloudError));
  }
}

function isSecurityLock(value: unknown): value is SecurityLock {
  return typeof value === 'object' && value !== null &&
    'failedAttempts' in value && typeof value.failedAttempts === 'number' && Number.isSafeInteger(value.failedAttempts) && value.failedAttempts >= 0 &&
    'lastFailedAt' in value && typeof value.lastFailedAt === 'number' && Number.isFinite(value.lastFailedAt) && value.lastFailedAt >= 0;
}

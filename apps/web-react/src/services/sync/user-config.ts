import { auth, db } from '../firebase';
import { doc } from 'firebase/firestore';

export function getUserConfigRef(configName: string) {
  const user = auth.currentUser;
  const userId = user && !user.isAnonymous ? user.uid : null;
  return userId ? doc(db, 'users', userId, 'config', configName) : null;
}

export function getSecurityLockStorageKey(): string {
  return `caderno_security_lock_${auth.currentUser?.uid || 'local'}`;
}

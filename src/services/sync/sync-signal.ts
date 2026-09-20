import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { logFirebaseOp } from './sync-monitor';

/**
 * Realtime listener passing cloud signal deviceId to callback.
 * Enables the caller to ignore echo signals dispatched from the same device.
 */
export function listenForCloudSyncSignal(onSignal: (deviceId?: string) => void) {
  const signalRef = doc(db, 'config', 'sync_signal');
  return onSnapshot(signalRef, (docSnap) => {
    logFirebaseOp('read', 1);
    if (docSnap.exists()) {
      const data = docSnap.data() as { deviceId?: string };
      onSignal(data?.deviceId);
    }
  });
}

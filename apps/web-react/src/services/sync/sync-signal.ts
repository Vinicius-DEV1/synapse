import { onSnapshot } from 'firebase/firestore';
import { logFirebaseOp } from './sync-monitor';
import { getSyncConfigDocument } from './sync-cloud-paths';

/**
 * Realtime listener passing cloud signal deviceId to callback.
 * Enables the caller to ignore echo signals dispatched from the same device.
 */
export function listenForCloudSyncSignal(
  onSignal: (deviceId?: string) => void,
  workspaceId?: string,
  userId?: string
) {
  const signalRef = getSyncConfigDocument('sync_signal', { workspaceId, userId });

  return onSnapshot(signalRef, (docSnap) => {
    logFirebaseOp('read', 1);
    if (docSnap.exists()) {
      const data = docSnap.data() as { deviceId?: string };
      onSignal(data?.deviceId);
    }
  });
}

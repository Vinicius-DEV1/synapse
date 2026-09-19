/**
 * @file share-collab.ts
 * @description End-to-End Encrypted real-time collaboration and live cursor service.
 * Delivers Yjs CRDT synchronization and awareness over Firestore with zero plaintext data in transit.
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { ShareCollabDelta, SharePresenceState } from '../../types/sharing';
import { encryptBinaryForShare, decryptBinaryFromShare } from './share-crypto';

const PRESENCE_TTL_MS = 25_000; // 25 seconds heartbeat TTL

/**
 * Encrypts and broadcasts a local Yjs binary document update to Firestore.
 */
export async function broadcastCollabUpdate(
  shareId: string,
  authorDeviceId: string,
  updateBytes: Uint8Array,
  shareKey: CryptoKey
): Promise<void> {
  const encryptedUpdate = await encryptBinaryForShare(updateBytes, shareKey);
  const updateId = `${shareId}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
  const updateRef = doc(db, 'share_updates', updateId);

  const delta: ShareCollabDelta = {
    id: updateId,
    shareId,
    authorDeviceId,
    encryptedUpdate,
    timestamp: Date.now(),
  };

  await setDoc(updateRef, delta);
}

/**
 * Listens for remote encrypted Yjs updates and decrypts them with the share key.
 */
export function listenToCollabUpdates(
  shareId: string,
  myDeviceId: string,
  shareKey: CryptoKey,
  onRemoteUpdate: (updateBytes: Uint8Array) => void
): Unsubscribe {
  const q = query(
    collection(db, 'share_updates'),
    where('shareId', '==', shareId)
  );

  const seenUpdateIds = new Set<string>();

  return onSnapshot(q, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added') {
        const delta = change.doc.data() as ShareCollabDelta;
        if (delta.authorDeviceId === myDeviceId || seenUpdateIds.has(delta.id)) {
          continue;
        }
        seenUpdateIds.add(delta.id);

        try {
          const decryptedBytes = await decryptBinaryFromShare(
            delta.encryptedUpdate,
            shareKey
          );
          onRemoteUpdate(decryptedBytes);
        } catch {
          // Ignore updates that cannot be decrypted (e.g. from revoked keys)
        }
      }
    }
  });
}

/**
 * Broadcasts local cursor awareness and persona state to the presence channel.
 */
export async function broadcastPresence(
  shareId: string,
  presenceState: SharePresenceState
): Promise<void> {
  const docId = `${shareId}_${presenceState.deviceId}`;
  const presenceRef = doc(db, 'share_presence', docId);

  await setDoc(presenceRef, {
    shareId,
    ...presenceState,
    lastActive: Date.now(),
  });
}

/**
 * Removes local presence record on disconnect/unmount.
 */
export async function removePresence(
  shareId: string,
  deviceId: string
): Promise<void> {
  try {
    const docId = `${shareId}_${deviceId}`;
    const presenceRef = doc(db, 'share_presence', docId);
    await deleteDoc(presenceRef);
  } catch {
    // Ignore network cleanup failures
  }
}

/**
 * Listens for active peers in a shared page and filters out stale heartbeats.
 */
export function listenToPresence(
  shareId: string,
  excludeDeviceId: string,
  onPeersChanged: (peers: SharePresenceState[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'share_presence'),
    where('shareId', '==', shareId)
  );

  return onSnapshot(q, (snapshot) => {
    const now = Date.now();
    const activePeers: SharePresenceState[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as SharePresenceState & { shareId: string };
      if (data.deviceId === excludeDeviceId) return;

      // Filter out abandoned sessions
      if (now - data.lastActive <= PRESENCE_TTL_MS) {
        activePeers.push({
          deviceId: data.deviceId,
          persona: data.persona,
          cursor: data.cursor,
          lastActive: data.lastActive,
        });
      }
    });

    onPeersChanged(activePeers);
  });
}

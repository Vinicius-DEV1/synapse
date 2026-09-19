/**
 * @file share-access-gate.ts
 * @description Owner-gated access control service and ECDH P-256 key exchange protocol.
 * Ensures the share key is never exposed on the network or in Firestore.
 * Derives ephemeral shared secrets via Diffie-Hellman, keeping plaintext keys strictly in client memory.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import type {
  DeviceFingerprint,
  ShareAccessRequest,
  ShareTrustedDevice,
} from '../../types/sharing';
import {
  computeSignalOverlap,
} from './device-fingerprint';
import {
  encryptBinaryForShare,
  decryptBinaryFromShare,
  exportShareKeyToBase64,
  importShareKeyFromBase64,
} from './share-crypto';

const ECDH_ALGORITHM = 'ECDH';
const NAMED_CURVE = 'P-256';
const AES_DERIVED_ALGORITHM = 'AES-GCM';

// ─── Ephemeral ECDH Key Exchange ────────────────────────────────────────────

/**
 * Generates an ephemeral ECDH P-256 key pair.
 */
export async function generateECDHKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: ECDH_ALGORITHM,
      namedCurve: NAMED_CURVE,
    },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Exports a public or private key to a stringified JWK for transmission.
 */
export async function exportKeyToJWK(key: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', key);
  return JSON.stringify(jwk);
}

/**
 * Imports a stringified JWK into an ECDH public key.
 */
export async function importPublicKeyFromJWK(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString) as JsonWebKey;
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: ECDH_ALGORITHM,
      namedCurve: NAMED_CURVE,
    },
    true,
    []
  );
}

/**
 * Derives a 256-bit symmetric AES-GCM key from ECDH shared secret.
 */
export async function deriveSharedSecretKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  return await crypto.subtle.deriveKey(
    {
      name: ECDH_ALGORITHM,
      public: publicKey,
    },
    privateKey,
    {
      name: AES_DERIVED_ALGORITHM,
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Wraps the share key with a derived shared secret.
 */
export async function wrapShareKeyWithSecret(
  shareKey: CryptoKey,
  sharedSecret: CryptoKey
): Promise<string> {
  const shareKeyBase64 = await exportShareKeyToBase64(shareKey);
  const bytes = new TextEncoder().encode(shareKeyBase64);
  return await encryptBinaryForShare(bytes, sharedSecret);
}

/**
 * Unwraps the share key with a derived shared secret.
 */
export async function unwrapShareKeyWithSecret(
  wrappedBase64: string,
  sharedSecret: CryptoKey
): Promise<CryptoKey> {
  const decryptedBytes = await decryptBinaryFromShare(wrappedBase64, sharedSecret);
  const shareKeyBase64 = new TextDecoder().decode(decryptedBytes);
  return await importShareKeyFromBase64(shareKeyBase64);
}

// ─── Firestore Access Request Lifecycle ─────────────────────────────────────

/**
 * Submits a new access request from a visitor browser.
 */
export async function submitAccessRequest(
  shareId: string,
  fingerprint: DeviceFingerprint,
  passwordVerified: boolean,
  visitorPublicKeyJwk: string
): Promise<string> {
  const reqRef = doc(collection(db, 'share_access_requests'));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10m TTL

  const request: ShareAccessRequest = {
    id: reqRef.id,
    shareId,
    deviceFingerprint: fingerprint,
    ipHash: fingerprint.fingerprintHash.slice(0, 16),
    status: 'pending',
    requestedAt: now.toISOString(),
    resolvedAt: null,
    expiresAt,
    passwordVerified,
    encryptedShareKey: null,
    visitorPublicKey: visitorPublicKeyJwk,
    ownerPublicKey: null,
  };

  await setDoc(reqRef, request);
  return reqRef.id;
}

/**
 * Listens for state changes on a specific visitor access request.
 */
export function listenToAccessRequest(
  requestId: string,
  onUpdate: (request: ShareAccessRequest) => void
): Unsubscribe {
  const reqRef = doc(db, 'share_access_requests', requestId);
  return onSnapshot(reqRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data() as ShareAccessRequest);
    }
  });
}

/**
 * Owner-side listener for incoming pending access requests across active shares.
 */
export function listenToPendingRequests(
  shareIds: string[],
  onRequests: (requests: ShareAccessRequest[]) => void
): Unsubscribe {
  if (shareIds.length === 0) {
    return () => {};
  }

  // Firestore "in" queries support up to 30 elements
  const targetIds = shareIds.slice(0, 30);
  const q = query(
    collection(db, 'share_access_requests'),
    where('shareId', 'in', targetIds),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (snapshot) => {
    const list: ShareAccessRequest[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as ShareAccessRequest);
    });
    onRequests(list);
  });
}

/**
 * Approves a pending access request:
 * 1. Generates ephemeral owner ECDH key pair
 * 2. Derives shared secret from visitor public key
 * 3. Wraps share key and publishes to request document
 * 4. Records trusted device
 */
export async function approveAccessRequest(
  request: ShareAccessRequest,
  shareKey: CryptoKey,
  trustDevice = true
): Promise<void> {
  const ownerKeyPair = await generateECDHKeyPair();
  const visitorPublicKey = await importPublicKeyFromJWK(request.visitorPublicKey);
  const sharedSecret = await deriveSharedSecretKey(ownerKeyPair.privateKey, visitorPublicKey);
  const encryptedShareKey = await wrapShareKeyWithSecret(shareKey, sharedSecret);
  const ownerPublicKeyJwk = await exportKeyToJWK(ownerKeyPair.publicKey);

  const reqRef = doc(db, 'share_access_requests', request.id);
  await updateDoc(reqRef, {
    status: 'approved',
    resolvedAt: new Date().toISOString(),
    encryptedShareKey,
    ownerPublicKey: ownerPublicKeyJwk,
  });

  if (trustDevice) {
    await registerTrustedDevice(
      request.shareId,
      request.deviceFingerprint,
      encryptedShareKey
    );
  }
}

/**
 * Denies an access request.
 */
export async function denyAccessRequest(requestId: string): Promise<void> {
  const reqRef = doc(db, 'share_access_requests', requestId);
  await updateDoc(reqRef, {
    status: 'denied',
    resolvedAt: new Date().toISOString(),
  });
}

// ─── Trusted Device Recognition ─────────────────────────────────────────────

/**
 * Registers an approved device as trusted in Firestore.
 */
export async function registerTrustedDevice(
  shareId: string,
  fingerprint: DeviceFingerprint,
  encryptedShareKey: string
): Promise<void> {
  const docId = `${shareId}_${fingerprint.fingerprintHash}`;
  const deviceRef = doc(db, 'share_trusted_devices', docId);

  const trustedRecord: ShareTrustedDevice = {
    id: docId,
    shareId,
    fingerprintHash: fingerprint.fingerprintHash,
    persistentToken: fingerprint.persistentToken,
    displayLabel: fingerprint.displayLabel,
    signals: fingerprint.signals,
    trustedAt: new Date().toISOString(),
    lastAccessAt: new Date().toISOString(),
    accessCount: 1,
    encryptedShareKey,
    isRevoked: false,
    revokedAt: null,
  };

  await setDoc(deviceRef, trustedRecord);
}

/**
 * Checks if a visitor device is trusted for a specific share link.
 */
export async function checkDeviceTrust(
  shareId: string,
  fingerprint: DeviceFingerprint
): Promise<{ isTrusted: boolean; encryptedShareKey?: string }> {
  // Check exact fingerprint match first
  const exactDocId = `${shareId}_${fingerprint.fingerprintHash}`;
  const exactRef = doc(db, 'share_trusted_devices', exactDocId);
  const exactSnap = await getDoc(exactRef);

  if (exactSnap.exists()) {
    const data = exactSnap.data() as ShareTrustedDevice;
    if (!data.isRevoked) {
      await updateDoc(exactRef, {
        lastAccessAt: new Date().toISOString(),
        accessCount: (data.accessCount || 1) + 1,
      });
      return { isTrusted: true, encryptedShareKey: data.encryptedShareKey };
    }
  }

  // Fallback: check persistent token match with >= 70% signal overlap
  const q = query(
    collection(db, 'share_trusted_devices'),
    where('shareId', '==', shareId),
    where('persistentToken', '==', fingerprint.persistentToken),
    where('isRevoked', '==', false)
  );

  const tokenMatches = await getDocs(q);
  for (const matchDoc of tokenMatches.docs) {
    const data = matchDoc.data() as ShareTrustedDevice;
    const overlap = computeSignalOverlap(fingerprint.signals, data.signals);
    if (overlap >= 0.70) {
      await updateDoc(matchDoc.ref, {
        lastAccessAt: new Date().toISOString(),
        accessCount: (data.accessCount || 1) + 1,
      });
      return { isTrusted: true, encryptedShareKey: data.encryptedShareKey };
    }
  }

  return { isTrusted: false };
}

/**
 * Revokes a trusted device record.
 */
export async function revokeTrustedDevice(deviceId: string): Promise<void> {
  const deviceRef = doc(db, 'share_trusted_devices', deviceId);
  await updateDoc(deviceRef, {
    isRevoked: true,
    revokedAt: new Date().toISOString(),
  });
}

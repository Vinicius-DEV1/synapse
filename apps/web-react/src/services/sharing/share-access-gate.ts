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
import { signInAnonymously } from 'firebase/auth';
import { auth, db } from '../firebase';
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
import { getVisitorShareKeyPair, saveVisitorShareKeyPair } from '../db-web';

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
  const visitor = auth.currentUser ?? (await signInAnonymously(auth)).user;
  const shareSnap = await getDoc(doc(db, 'shared_pages', shareId));
  if (!shareSnap.exists() || shareSnap.data().isActive !== true) {
    throw new Error('This share is unavailable or has been revoked.');
  }
  const ownerUid = shareSnap.data().ownerUid;
  if (typeof ownerUid !== 'string' || !ownerUid) {
    throw new Error('This share does not have a valid owner account.');
  }
  const visitorKeyPair = await getOrCreatePersistentVisitorKeyPair();
  const visitorTrustPublicKey = await exportKeyToJWK(visitorKeyPair.publicKey);
  const reqRef = doc(collection(db, 'share_access_requests'));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10m TTL

  const request: ShareAccessRequest = {
    id: reqRef.id,
    shareId,
    ownerUid,
    visitorUid: visitor.uid,
    deviceFingerprint: fingerprint,
    ipHash: fingerprint.fingerprintHash.slice(0, 16),
    status: 'pending',
    requestedAt: now.toISOString(),
    resolvedAt: null,
    expiresAt,
    passwordVerified,
    encryptedShareKey: null,
    visitorPublicKey: visitorPublicKeyJwk,
    visitorTrustPublicKey,
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
  onUpdate: (request: ShareAccessRequest) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const reqRef = doc(db, 'share_access_requests', requestId);
  return onSnapshot(
    reqRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as ShareAccessRequest);
      }
    },
    (err) => {
      onError?.(err);
    }
  );
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
  const ownerUid = auth.currentUser?.uid;
  if (!ownerUid || auth.currentUser?.isAnonymous) return () => {};

  // Firestore "in" queries support up to 30 elements
  const targetIds = shareIds.slice(0, 30);
  const q = query(
    collection(db, 'share_access_requests'),
    where('shareId', 'in', targetIds),
    where('ownerUid', '==', ownerUid),
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
  if (!auth.currentUser || auth.currentUser.uid !== request.ownerUid || auth.currentUser.isAnonymous) {
    throw new Error('Only the signed-in share owner can approve this request.');
  }
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
    try {
      await registerTrustedDevice(
        request.shareId,
        request.deviceFingerprint,
        shareKey,
        request.visitorUid,
        request.visitorTrustPublicKey
      );
    } catch (trustError: unknown) {
      console.warn('[ShareAccess] Approval succeeded, but trusted-device registration failed.', trustError);
    }
  }
}

/**
 * Denies an access request.
 */
export async function denyAccessRequest(request: ShareAccessRequest): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== request.ownerUid || auth.currentUser.isAnonymous) {
    throw new Error('Only the signed-in share owner can deny this request.');
  }
  const reqRef = doc(db, 'share_access_requests', request.id);
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
  shareKey: CryptoKey,
  visitorUid: string,
  visitorTrustPublicKey: string
): Promise<void> {
  const ownerUid = auth.currentUser?.uid;
  if (!ownerUid || auth.currentUser?.isAnonymous) throw new Error('A signed-in share owner is required.');
  const ownerKeyPair = await generateECDHKeyPair();
  const visitorPublicKey = await importPublicKeyFromJWK(visitorTrustPublicKey);
  const sharedSecret = await deriveSharedSecretKey(ownerKeyPair.privateKey, visitorPublicKey);
  const encryptedShareKey = await wrapShareKeyWithSecret(shareKey, sharedSecret);
  const ownerPublicKey = await exportKeyToJWK(ownerKeyPair.publicKey);
  const docId = `${shareId}_${fingerprint.fingerprintHash}`;
  const deviceRef = doc(db, 'share_trusted_devices', docId);

  const trustedRecord: ShareTrustedDevice = {
    id: docId,
    shareId,
    ownerUid,
    visitorUid,
    fingerprintHash: fingerprint.fingerprintHash,
    persistentToken: fingerprint.persistentToken,
    displayLabel: fingerprint.displayLabel,
    signals: fingerprint.signals,
    trustedAt: new Date().toISOString(),
    lastAccessAt: new Date().toISOString(),
    accessCount: 1,
    encryptedShareKey,
    ownerPublicKey,
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
): Promise<{ isTrusted: boolean; shareKey?: CryptoKey }> {
  let visitor = auth.currentUser;
  if (!visitor) {
    try {
      visitor = (await signInAnonymously(auth)).user;
    } catch (authError: unknown) {
      console.warn('[ShareAccess] Anonymous sign-in unavailable; continuing without device trust.', authError);
      return { isTrusted: false };
    }
  }
  const visitorKeyPair = await getOrCreatePersistentVisitorKeyPair();

  // Check exact fingerprint match first
  const exactDocId = `${shareId}_${fingerprint.fingerprintHash}`;
  const exactRef = doc(db, 'share_trusted_devices', exactDocId);
  const exactSnap = await getDoc(exactRef);

  if (exactSnap.exists()) {
    const data = exactSnap.data() as ShareTrustedDevice;
    if (!data.isRevoked && data.visitorUid === visitor.uid) {
      return { isTrusted: true, shareKey: await unwrapTrustedDeviceKey(data, visitorKeyPair) };
    }
  }

  // Fallback: check persistent token match with >= 70% signal overlap
  const q = query(
    collection(db, 'share_trusted_devices'),
    where('shareId', '==', shareId),
    where('visitorUid', '==', visitor.uid),
    where('isRevoked', '==', false)
  );

  const tokenMatches = await getDocs(q);
  for (const matchDoc of tokenMatches.docs) {
    const data = matchDoc.data() as ShareTrustedDevice;
    const overlap = computeSignalOverlap(fingerprint.signals, data.signals);
    if (overlap >= 0.70) {
      return { isTrusted: true, shareKey: await unwrapTrustedDeviceKey(data, visitorKeyPair) };
    }
  }

  return { isTrusted: false };
}

async function getOrCreatePersistentVisitorKeyPair(): Promise<CryptoKeyPair> {
  const existingKeyPair = await getVisitorShareKeyPair();
  if (existingKeyPair) return existingKeyPair;
  const keyPair = await generateECDHKeyPair();
  await saveVisitorShareKeyPair(keyPair);
  return keyPair;
}

async function unwrapTrustedDeviceKey(
  record: ShareTrustedDevice,
  visitorKeyPair: CryptoKeyPair
): Promise<CryptoKey> {
  const ownerPublicKey = await importPublicKeyFromJWK(record.ownerPublicKey);
  const sharedSecret = await deriveSharedSecretKey(visitorKeyPair.privateKey, ownerPublicKey);
  return await unwrapShareKeyWithSecret(record.encryptedShareKey, sharedSecret);
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

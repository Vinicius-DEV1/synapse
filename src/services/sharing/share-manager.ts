/**
 * @file share-manager.ts
 * @description Orchestrator for Caderno's Page Sharing feature.
 * Coordinates snapshotting, isolated symmetric encryption, Firestore persistence,
 * local key caching in IndexedDB, and link generation.
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';
import { platform } from '../platform';
import type { Page } from '../../types/notes';
import type {
  CreateShareRequest,
  SharedPageConfig,
  SharedPagePayload,
  ShareAccessLog,
  UpdateShareRequest,
} from '../../types/sharing';
import {
  computeContentHash,
  computeSha256Hex,
  encryptForShare,
  exportShareKeyToBase64,
  generateRandomSalt,
  generateShareId,
  generateShareKey,
  hashPasswordPBKDF2,
  wrapShareKeyWithMaster,
} from './share-crypto';
import { generateDeviceFingerprint } from './device-fingerprint';
import {
  deleteWebShareKey,
  getWebShareKey,
  getWebShareKeyByPage,
  listWebShareKeys,
  saveWebShareKey,
} from '../db-web';

/**
 * Builds the public share URL given a shareId.
 */
export function buildShareUrl(shareId: string): string {
  // Allow local URL in dev server for fast testing if explicitly accessed via localhost
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `${window.location.origin}/s/${shareId}`;
  }

  const shareDomain = import.meta.env.VITE_FIREBASE_SHARE_DOMAIN || 'synapse-web.web.app';
  const baseDomain = shareDomain.startsWith('http') ? shareDomain : `https://${shareDomain}`;
  return `${baseDomain}/s/${shareId}`;
}

/**
 * Creates a brand new secure share for a page.
 */
export async function createShare(
  req: CreateShareRequest,
  page: Page,
  masterKey?: CryptoKey
): Promise<{ shareId: string; shareUrl: string; config: SharedPageConfig }> {
  const shareId = generateShareId();
  const shareKey = await generateShareKey();
  const shareKeyBase64 = await exportShareKeyToBase64(shareKey);
  const encryptionKeyHash = await computeSha256Hex(shareKeyBase64);

  const localFingerprint = await generateDeviceFingerprint();
  const now = new Date().toISOString();

  // Password handling
  let passwordHash: string | null = null;
  let passwordSalt: string | null = null;
  if (req.password && req.password.trim().length > 0) {
    passwordSalt = generateRandomSalt();
    passwordHash = await hashPasswordPBKDF2(req.password, passwordSalt);
  }

  // Key wrapping
  let wrappedShareKey = shareKeyBase64;
  if (masterKey) {
    wrappedShareKey = await wrapShareKeyWithMaster(shareKey, masterKey);
  }

  const rawContent = page.content || '';
  const encryptedContent = await encryptForShare(rawContent, shareKey);
  const encryptedTitle = await encryptForShare(page.title || 'Untitled', shareKey);
  const encryptedIcon = await encryptForShare(page.icon || '📄', shareKey);
  const contentHash = await computeContentHash(rawContent);

  const config: SharedPageConfig = {
    id: shareId,
    pageId: page.id,
    ownerId: localFingerprint.fingerprintHash,
    scope: req.scope,
    includeMedia: req.includeMedia,
    isPasswordProtected: Boolean(passwordHash),
    passwordHash,
    passwordSalt,
    requireOwnerApproval: req.requireOwnerApproval,
    permission: req.permission,
    encryptionKeyHash,
    wrappedShareKey,
    isActive: true,
    expiresAt: req.expiresAt,
    maxViews: req.maxViews,
    viewCount: 0,
    title: page.title || 'Untitled',
    icon: page.icon || '📄',
    createdAt: now,
    updatedAt: now,
  };

  const payload: SharedPagePayload = {
    shareId,
    encryptedContent,
    encryptedTitle,
    encryptedIcon,
    coverImage: page.cover_image || null,
    contentHash,
    updatedAt: now,
  };

  // Persist config and content in Firestore
  await setDoc(doc(db, 'shared_pages', shareId), config);
  await setDoc(doc(db, 'shared_page_content', shareId), payload);

  // Cache share key locally in IndexedDB
  await saveWebShareKey({
    shareId,
    pageId: page.id,
    shareKeyBase64,
    config,
    createdAt: now,
  });

  // Log creation
  await logShareAccess({
    shareId,
    accessedAt: now,
    ipHash: localFingerprint.fingerprintHash.slice(0, 16),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Caderno-Desktop',
    deviceFingerprintHash: localFingerprint.fingerprintHash,
    action: 'unlock',
    metadata: { reason: 'Created share' },
  });

  return {
    shareId,
    shareUrl: buildShareUrl(shareId),
    config,
  };
}

/**
 * Updates the encrypted content of an already shared page.
 */
export async function updateShareContent(
  shareId: string,
  page: Page,
  shareKey: CryptoKey
): Promise<void> {
  const rawContent = page.content || '';
  const encryptedContent = await encryptForShare(rawContent, shareKey);
  const encryptedTitle = await encryptForShare(page.title || 'Untitled', shareKey);
  const encryptedIcon = await encryptForShare(page.icon || '📄', shareKey);
  const contentHash = await computeContentHash(rawContent);
  const now = new Date().toISOString();

  const payload: Partial<SharedPagePayload> = {
    encryptedContent,
    encryptedTitle,
    encryptedIcon,
    coverImage: page.cover_image || null,
    contentHash,
    updatedAt: now,
  };

  await updateDoc(doc(db, 'shared_page_content', shareId), payload);
  await updateDoc(doc(db, 'shared_pages', shareId), {
    title: page.title || 'Untitled',
    icon: page.icon || '📄',
    updatedAt: now,
  });
}

/**
 * Updates configuration settings (password, permissions, expiration) of a share.
 */
export async function updateShareConfig(req: UpdateShareRequest): Promise<void> {
  const updates: Partial<SharedPageConfig> = {
    updatedAt: new Date().toISOString(),
  };

  if (req.password !== undefined) {
    if (req.password && req.password.trim().length > 0) {
      const salt = generateRandomSalt();
      updates.passwordSalt = salt;
      updates.passwordHash = await hashPasswordPBKDF2(req.password, salt);
      updates.isPasswordProtected = true;
    } else {
      updates.passwordSalt = null;
      updates.passwordHash = null;
      updates.isPasswordProtected = false;
    }
  }

  if (req.requireOwnerApproval !== undefined) {
    updates.requireOwnerApproval = req.requireOwnerApproval;
  }
  if (req.permission !== undefined) {
    updates.permission = req.permission;
  }
  if (req.isActive !== undefined) {
    updates.isActive = req.isActive;
  }
  if (req.expiresAt !== undefined) {
    updates.expiresAt = req.expiresAt;
  }
  if (req.maxViews !== undefined) {
    updates.maxViews = req.maxViews;
  }

  await updateDoc(doc(db, 'shared_pages', req.shareId), updates);

  // Update local DB cache if present
  const cached = await getWebShareKey(req.shareId);
  if (cached) {
    await saveWebShareKey({
      ...cached,
      config: { ...cached.config, ...updates },
    });
  }
}

/**
 * Revokes a share link immediately, rendering it inactive.
 */
export async function revokeShare(shareId: string): Promise<void> {
  await updateDoc(doc(db, 'shared_pages', shareId), {
    isActive: false,
    updatedAt: new Date().toISOString(),
  });

  const cached = await getWebShareKey(shareId);
  if (cached) {
    await saveWebShareKey({
      ...cached,
      config: { ...cached.config, isActive: false },
    });
  }
}

/**
 * Permanently deletes a share from Firestore and local cache.
 */
export async function deleteShare(shareId: string): Promise<void> {
  await deleteDoc(doc(db, 'shared_pages', shareId));
  await deleteDoc(doc(db, 'shared_page_content', shareId));
  await deleteWebShareKey(shareId);
}

/**
 * Retrieves the active share config for a specific notebook page.
 */
export async function getShareByPageId(pageId: string): Promise<SharedPageConfig | null> {
  // Check local cache first for 0ms latency
  const cached = await getWebShareKeyByPage(pageId);
  if (cached?.config && cached.config.isActive) {
    return cached.config as SharedPageConfig;
  }

  // Fallback to Firestore query
  const q = query(
    collection(db, 'shared_pages'),
    where('pageId', '==', pageId),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].data() as SharedPageConfig;
  }

  return null;
}

/**
 * Lists all shares owned by this device.
 */
export async function listShares(): Promise<SharedPageConfig[]> {
  const localKeys = await listWebShareKeys();
  if (localKeys.length > 0) {
    return localKeys.map((item) => item.config as SharedPageConfig);
  }

  const localFingerprint = await generateDeviceFingerprint();
  const q = query(
    collection(db, 'shared_pages'),
    where('ownerId', '==', localFingerprint.fingerprintHash)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SharedPageConfig);
}

/**
 * Logs an access event to the append-only `share_access_logs` collection.
 */
export async function logShareAccess(log: Omit<ShareAccessLog, 'id'>): Promise<void> {
  try {
    const logRef = doc(collection(db, 'share_access_logs'));
    await setDoc(logRef, {
      id: logRef.id,
      ...log,
    });
  } catch {
    // Audit log failure should not block page rendering
  }
}

/**
 * Queries the access logs for a specific share.
 */
export async function getAccessLogs(
  shareId: string,
  maxLogs = 50
): Promise<ShareAccessLog[]> {
  const q = query(
    collection(db, 'share_access_logs'),
    where('shareId', '==', shareId),
    orderBy('accessedAt', 'desc'),
    limit(maxLogs)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ShareAccessLog);
}

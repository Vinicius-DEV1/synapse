/**
 * @file ShareViewerApp.tsx
 * @description Standalone root application for the public visitor-facing share viewer.
 * Implements the complete two-phase gated access state machine with ECDH key exchange,
 * persistent device fingerprinting, and witty animal pun personas.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type {
  SharedPageConfig,
  SharedPagePayload,
  DeviceFingerprint,
  VisitorPersona,
} from '../types/sharing';
import {
  decryptFromShare,
  importShareKeyFromBase64,
  verifyPasswordHash,
} from '../services/sharing/share-crypto';
import { generateDeviceFingerprint } from '../services/sharing/device-fingerprint';
import { getOrGeneratePersona } from '../services/sharing/share-persona';
import {
  generateECDHKeyPair,
  exportKeyToJWK,
  importPublicKeyFromJWK,
  deriveSharedSecretKey,
  unwrapShareKeyWithSecret,
  submitAccessRequest,
  listenToAccessRequest,
  checkDeviceTrust,
} from '../services/sharing/share-access-gate';
import { logShareAccess } from '../services/sharing/share-manager';

// Subcomponents
import { ShareLoadingScreen } from './components/ShareLoadingScreen';
import { SharePasswordGate } from './components/SharePasswordGate';
import { ShareWaitingApproval } from './components/ShareWaitingApproval';
import { ShareAccessDenied } from './components/ShareAccessDenied';
import { ShareExpiredScreen } from './components/ShareExpiredScreen';
import { ShareContentViewer } from './components/ShareContentViewer';

type ViewerState =
  | { status: 'loading' }
  | { status: 'password-gate' }
  | { status: 'waiting-approval'; requestedAt: string }
  | { status: 'access-denied' }
  | { status: 'expired'; reason: 'revoked' | 'expired' | 'not-found' }
  | {
      status: 'content';
      config: SharedPageConfig;
      decryptedContent: string;
      shareKey: CryptoKey;
    };

/**
 * Extracts shareId from path (/s/:shareId) or query param (?s=:shareId)
 */
function extractShareId(): string | null {
  if (typeof window === 'undefined') return null;

  // Path format: /s/abc123xyz456
  const match = window.location.pathname.match(/\/s\/([A-Za-z0-9\-_]+)/);
  if (match?.[1]) return match[1];

  // Query parameter fallback: ?s=abc123xyz456
  const params = new URLSearchParams(window.location.search);
  return params.get('s') || params.get('shareId');
}

export const ShareViewerApp: React.FC = () => {
  const [state, setState] = useState<ViewerState>({ status: 'loading' });
  const [shareConfig, setShareConfig] = useState<SharedPageConfig | null>(null);
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null);
  const [persona, setPersona] = useState<VisitorPersona | null>(null);

  // 1. Initial Load & Device Identification
  useEffect(() => {
    let isMounted = true;

    async function init() {
      const shareId = extractShareId();
      if (!shareId) {
        setState({ status: 'expired', reason: 'not-found' });
        return;
      }

      try {
        // Collect fingerprint & persona
        const fp = await generateDeviceFingerprint();
        const p = getOrGeneratePersona(fp.fingerprintHash, fp.persistentToken);
        if (!isMounted) return;

        setFingerprint(fp);
        setPersona(p);

        // Fetch share metadata from Firestore
        const shareRef = doc(db, 'shared_pages', shareId);
        const shareSnap = await getDoc(shareRef);

        if (!shareSnap.exists()) {
          setState({ status: 'expired', reason: 'not-found' });
          return;
        }

        const config = shareSnap.data() as SharedPageConfig;
        setShareConfig(config);

        if (!config.isActive) {
          setState({ status: 'expired', reason: 'revoked' });
          return;
        }

        if (config.expiresAt && new Date(config.expiresAt).getTime() < Date.now()) {
          setState({ status: 'expired', reason: 'expired' });
          return;
        }

        // Check if device was previously approved (trusted device bypass)
        const trustCheck = await checkDeviceTrust(shareId, fp);
        if (trustCheck.isTrusted && trustCheck.encryptedShareKey) {
          // Device is trusted! Decrypt content immediately
          const shareKey = await importShareKeyFromBase64(trustCheck.encryptedShareKey);
          await loadAndDisplayContent(config, shareKey, fp);
          return;
        }

        // If not trusted: determine gate
        if (config.isPasswordProtected) {
          setState({ status: 'password-gate' });
        } else if (config.requireOwnerApproval) {
          // No password, but owner approval required
          await initiateAccessRequest(config, fp, false);
        } else {
          // Unprotected share: deliver key directly
          const shareKey = await importShareKeyFromBase64(config.wrappedShareKey);
          await loadAndDisplayContent(config, shareKey, fp);
        }
      } catch (err) {
        console.error('Error during share viewer initialization:', err);
        if (isMounted) {
          setState({ status: 'expired', reason: 'not-found' });
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch encrypted content payload and decrypt with verified key
  const loadAndDisplayContent = async (
    config: SharedPageConfig,
    shareKey: CryptoKey,
    fp: DeviceFingerprint
  ) => {
    const contentRef = doc(db, 'shared_page_content', config.id);
    const contentSnap = await getDoc(contentRef);
    if (!contentSnap.exists()) {
      setState({ status: 'expired', reason: 'not-found' });
      return;
    }

    const payload = contentSnap.data() as SharedPagePayload;
    const decrypted = await decryptFromShare(payload.encryptedContent, shareKey);

    // Audit log access
    await logShareAccess({
      shareId: config.id,
      accessedAt: new Date().toISOString(),
      ipHash: fp.fingerprintHash.slice(0, 16),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      deviceFingerprintHash: fp.fingerprintHash,
      action: 'view',
    });

    setState({
      status: 'content',
      config,
      decryptedContent: decrypted,
      shareKey,
    });
  };

  // 3. Initiate access request with ECDH key pair
  const initiateAccessRequest = async (
    config: SharedPageConfig,
    fp: DeviceFingerprint,
    passwordVerified: boolean
  ) => {
    const keyPair = await generateECDHKeyPair();

    const visitorPublicKeyJwk = await exportKeyToJWK(keyPair.publicKey);
    const requestId = await submitAccessRequest(
      config.id,
      fp,
      passwordVerified,
      visitorPublicKeyJwk
    );

    const now = new Date().toISOString();
    setState({ status: 'waiting-approval', requestedAt: now });

    // Listen to real-time status resolution via Firestore onSnapshot
    const unsubscribe = listenToAccessRequest(requestId, async (updatedRequest) => {
      if (updatedRequest.status === 'approved') {
        unsubscribe();
        if (updatedRequest.encryptedShareKey && updatedRequest.ownerPublicKey) {
          try {
            const ownerPublicKey = await importPublicKeyFromJWK(updatedRequest.ownerPublicKey);
            const sharedSecret = await deriveSharedSecretKey(keyPair.privateKey, ownerPublicKey);
            const shareKey = await unwrapShareKeyWithSecret(
              updatedRequest.encryptedShareKey,
              sharedSecret
            );
            await loadAndDisplayContent(config, shareKey, fp);
          } catch (err) {
            console.error('Failed to unwrap approved share key:', err);
            setState({ status: 'access-denied' });
          }
        }
      } else if (updatedRequest.status === 'denied') {
        unsubscribe();
        setState({ status: 'access-denied' });
      }
    });
  };

  // 4. Handle Password Submission
  const handlePasswordVerify = useCallback(
    async (candidatePassword: string): Promise<boolean> => {
      if (!shareConfig || !fingerprint) return false;

      if (shareConfig.passwordHash && shareConfig.passwordSalt) {
        const isValid = await verifyPasswordHash(
          candidatePassword,
          shareConfig.passwordSalt,
          shareConfig.passwordHash
        );

        if (!isValid) {
          return false;
        }

        // Password verified! If owner approval required, proceed to gate
        if (shareConfig.requireOwnerApproval) {
          await initiateAccessRequest(shareConfig, fingerprint, true);
        } else {
          // Direct unlock
          const shareKey = await importShareKeyFromBase64(shareConfig.wrappedShareKey);
          await loadAndDisplayContent(shareConfig, shareKey, fingerprint);
        }
        return true;
      }
      return false;
    },
    [shareConfig, fingerprint]
  );

  // ─── Render View by State ─────────────────────────────────────────────────

  if (state.status === 'loading') {
    return <ShareLoadingScreen title={shareConfig?.title} icon={shareConfig?.icon} />;
  }

  if (state.status === 'expired') {
    return <ShareExpiredScreen reason={state.reason} />;
  }

  if (state.status === 'password-gate') {
    return (
      <SharePasswordGate
        pageTitle={shareConfig?.title || 'Página Protegida'}
        pageIcon={shareConfig?.icon || '📄'}
        onVerify={handlePasswordVerify}
      />
    );
  }

  if (state.status === 'waiting-approval') {
    return (
      <ShareWaitingApproval
        pageTitle={shareConfig?.title || 'Página Compartilhada'}
        pageIcon={shareConfig?.icon || '📄'}
        persona={persona || { name: 'Anonymous', animal: 'User', color: '#10b981', tagline: '' }}
        requestedAt={state.requestedAt}
      />
    );
  }

  if (state.status === 'access-denied') {
    return (
      <ShareAccessDenied
        onRetry={() => {
          setState({ status: 'loading' });
          window.location.reload();
        }}
      />
    );
  }

  if (state.status === 'content') {
    return (
      <ShareContentViewer
        config={state.config}
        initialContent={state.decryptedContent}
        shareKey={state.shareKey}
        myDeviceId={fingerprint?.persistentToken || 'visitor'}
        myPersona={persona || { name: 'SyntaxLynx', animal: 'Lynx', color: '#10b981', tagline: '' }}
      />
    );
  }

  return null;
};

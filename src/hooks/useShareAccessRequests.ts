/**
 * @file useShareAccessRequests.ts
 * @description Hook that listens in real-time to incoming access requests from visitors
 * across all active shared pages. Plays a subtle audio chime when a visitor knocks on the door.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { ShareAccessRequest, SharedPageConfig } from '../types/sharing';
import {
  listenToPendingRequests,
  approveAccessRequest,
  denyAccessRequest,
} from '../services/sharing/share-access-gate';
import { listShares } from '../services/sharing/share-manager';
import { getWebShareKey } from '../services/db-web';
import { importShareKeyFromBase64 } from '../services/sharing/share-crypto';

/**
 * Plays a discrete, pleasant 2-tone notification chime via Web Audio API.
 */
function playAccessChime() {
  if (typeof window === 'undefined' || !window.AudioContext) return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch {
    // Audio playback policy may block unprompted audio; fail silently
  }
}

export function useShareAccessRequests() {
  const [shares, setShares] = useState<SharedPageConfig[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ShareAccessRequest[]>([]);
  const [activeModalRequest, setActiveModalRequest] = useState<ShareAccessRequest | null>(null);
  const previousPendingCountRef = useRef<number>(0);

  // Load owned shares to know which share IDs to listen for
  const reloadShares = useCallback(async () => {
    try {
      const activeShares = await listShares();
      setShares(activeShares.filter((s) => s.isActive && s.requireOwnerApproval));
    } catch {
      // Offline fallback
    }
  }, []);

  useEffect(() => {
    reloadShares();
    const handleShareCreated = () => reloadShares();
    window.addEventListener('caderno-share-created', handleShareCreated);
    return () => window.removeEventListener('caderno-share-created', handleShareCreated);
  }, [reloadShares]);

  // Register real-time Firestore listener on pending requests
  useEffect(() => {
    if (shares.length === 0) {
      setPendingRequests([]);
      return;
    }

    const shareIds = shares.map((s) => s.id);
    const unsubscribe = listenToPendingRequests(shareIds, (requests) => {
      // If a new request arrived, chime!
      if (requests.length > previousPendingCountRef.current) {
        playAccessChime();
      }
      previousPendingCountRef.current = requests.length;
      setPendingRequests(requests);
    });

    return () => unsubscribe();
  }, [shares]);

  // Handle owner approve action
  const handleApprove = useCallback(
    async (request: ShareAccessRequest, trustDevice = true): Promise<boolean> => {
      try {
        const cached = await getWebShareKey(request.shareId);
        if (!cached?.shareKeyBase64) {
          throw new Error('Local share key not found on this device');
        }
        const shareKey = await importShareKeyFromBase64(cached.shareKeyBase64);
        await approveAccessRequest(request, shareKey, trustDevice);

        setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
        if (activeModalRequest?.id === request.id) {
          setActiveModalRequest(null);
        }
        return true;
      } catch (err) {
        console.error('Failed to approve access request:', err);
        return false;
      }
    },
    [activeModalRequest]
  );

  // Handle owner deny action
  const handleDeny = useCallback(
    async (requestId: string): Promise<boolean> => {
      try {
        await denyAccessRequest(requestId);
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        if (activeModalRequest?.id === requestId) {
          setActiveModalRequest(null);
        }
        return true;
      } catch (err) {
        console.error('Failed to deny access request:', err);
        return false;
      }
    },
    [activeModalRequest]
  );

  return {
    shares,
    pendingRequests,
    activeModalRequest,
    setActiveModalRequest,
    approveRequest: handleApprove,
    denyRequest: handleDeny,
    refreshShares: reloadShares,
  };
}

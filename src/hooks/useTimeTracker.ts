import { useEffect, useRef } from 'react';
import { logActivity } from '../services/stats-manager';

export interface UseTimeTrackerProps {
  itemId: string;
  itemTitle: string;
  module: 'lofi' | 'video' | 'library';
  isActive: boolean;
  // If true, the module must manually trigger activity tracking (like EpubReader scrolling).
  // If false, time counts automatically when isActive is true (like video/audio playing).
  requireInteraction?: boolean;
}

export function useTimeTracker({ itemId, itemTitle, module, isActive, requireInteraction = false }: UseTimeTrackerProps) {
  const accumulatedSeconds = useRef(0);
  const lastTick = useRef(Date.now());
  const interactionTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInteracting = useRef(false);

  useEffect(() => {
    // Reset last tick on mount or when dependencies change
    lastTick.current = Date.now();

    const timer = setInterval(() => {
      const now = Date.now();
      const deltaMs = now - lastTick.current;
      lastTick.current = now;

      if (!isActive) return;
      if (requireInteraction && !isInteracting.current) return;

      accumulatedSeconds.current += Math.floor(deltaMs / 1000);

      // Flush to DB if >= 60 seconds accumulated
      if (accumulatedSeconds.current >= 60) {
        logActivity(module, itemId, itemTitle, accumulatedSeconds.current);
        accumulatedSeconds.current = 0;
      }
    }, 10000);

    return () => {
      clearInterval(timer);
      if (accumulatedSeconds.current > 0) {
        logActivity(module, itemId, itemTitle, accumulatedSeconds.current);
        accumulatedSeconds.current = 0;
      }
    };
  }, [itemId, itemTitle, module, isActive, requireInteraction]);

  // Handle interaction for 'library' or modules where playing is passive reading
  useEffect(() => {
    if (!requireInteraction) return;

    const handleActivity = () => {
      isInteracting.current = true;
      if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
      // User is considered interacting for 2 minutes after last action
      interactionTimeout.current = setTimeout(() => {
        isInteracting.current = false;
      }, 120000);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // trigger once on mount
    handleActivity();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
    };
  }, [requireInteraction]);
}

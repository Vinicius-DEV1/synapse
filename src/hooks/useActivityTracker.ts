import { useEffect, useRef } from 'react';

export interface UseActivityTrackerProps {
  timeoutMinutes: number; // 0 means disabled
  onTimeout: () => void;
  isActive: boolean; // whether to run the tracker
}

export function useActivityTracker({ timeoutMinutes, onTimeout, isActive }: UseActivityTrackerProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isActive || timeoutMinutes <= 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const ms = timeoutMinutes * 60 * 1000;

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onTimeout();
      }, ms);
    };

    // Throttle events to avoid performance issues
    let lastEventTime = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastEventTime > 5000) { // Only reset timer at most every 5 seconds
        lastEventTime = now;
        resetTimer();
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // Initial setup
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [timeoutMinutes, onTimeout, isActive]);
}

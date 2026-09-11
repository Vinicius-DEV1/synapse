import { useState, useEffect, useRef, type Dispatch } from 'react';
import { getSettings } from '../utils/settings';
import type { Action } from '../types/store';

export function useAppAuth(dispatch: Dispatch<Action>) {
  const [isAuth, setIsAuth] = useState(false);
  const [authStatus, setAuthStatus] = useState<'new' | 'unencrypted' | 'encrypted' | 'error' | null>(null);
  const isAuthRef = useRef(isAuth);
  isAuthRef.current = isAuth;

  useEffect(() => {
    if (window.api?.auth) {
      window.api.auth.status().then((res: { status: 'new' | 'unencrypted' | 'encrypted' | 'error' }) => {
        setAuthStatus(res.status);
      }).catch((err: unknown) => {
        console.error('Failed to get auth status:', err);
      });

      const cleanup = window.api.auth.onLock(() => {
        setIsAuth(false);
        setAuthStatus('encrypted');
        dispatch({ type: 'SET_MODULE_KEYS', keys: {} });
      });
      
      // Initialize backend preferences
      window.api.auth.setPreferences({ autoLockOnSuspend: getSettings().autoLockOnSuspend });

      // Suspend / sleep detection via timer drift
      // When the OS suspends (e.g. Linux lid closed, sleep mode), timers are halted.
      // Upon resume, elapsed time between ticks significantly exceeds the normal interval.
      const CHECK_INTERVAL_MS = 2000;
      const DRIFT_THRESHOLD_MS = 10000;
      let lastTick = Date.now();

      const driftInterval = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTick;
        lastTick = now;

        if (delta > DRIFT_THRESHOLD_MS) {
          const currentSettings = getSettings();
          if (currentSettings.autoLockOnSuspend && isAuthRef.current) {
            if (window.api?.auth?.lock) {
              window.api.auth.lock().catch((err: unknown) => {
                console.error('[useAppAuth] Failed to lock on suspend:', err);
              });
            }
            setIsAuth(false);
            setAuthStatus('encrypted');
            dispatch({ type: 'SET_MODULE_KEYS', keys: {} });
          }
        }
      }, CHECK_INTERVAL_MS);

      return () => {
        cleanup?.();
        clearInterval(driftInterval);
      };
    }
  }, [dispatch]);

  return { isAuth, setIsAuth, authStatus, setAuthStatus };
}


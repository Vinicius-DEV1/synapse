import { useState, useEffect } from 'react';
import { getSettings } from '../utils/settings';

export function useAppAuth(dispatch: any) {
  const [isAuth, setIsAuth] = useState(false);
  const [authStatus, setAuthStatus] = useState<'new' | 'unencrypted' | 'encrypted' | 'error' | null>(null);

  useEffect(() => {
    if (window.api?.auth) {
      window.api.auth.status().then((res: any) => {
        setAuthStatus(res.status);
      }).catch((err: any) => {
        console.error('Failed to get auth status:', err);
      });

      const cleanup = window.api.auth.onLock(() => {
        setIsAuth(false);
        setAuthStatus('encrypted');
        dispatch({ type: 'SET_MODULE_KEYS', keys: {} });
      });
      
      // Initialize backend preferences
      window.api.auth.setPreferences({ autoLockOnSuspend: getSettings().autoLockOnSuspend });

      return cleanup;
    }
  }, [dispatch]);

  return { isAuth, setIsAuth, authStatus, setAuthStatus };
}

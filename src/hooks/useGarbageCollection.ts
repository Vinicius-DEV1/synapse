import { useEffect } from 'react';

export function useGarbageCollection(isAuth: boolean) {
  useEffect(() => {
    if (isAuth) {
      const lastRunStr = localStorage.getItem('last_gc_run');
      const lastRun = lastRunStr ? parseInt(lastRunStr, 10) : 0;
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      
      if (Date.now() - lastRun > SEVEN_DAYS) {
        Promise.allSettled([
          import('../services/image-gc').then((m) => m.runImageGarbageCollector()),
          import('../services/link-vault/link-gc').then((m) => m.runLinkGarbageCollector()),
        ]).then(() => {
          localStorage.setItem('last_gc_run', Date.now().toString());
        });
      }
    }
  }, [isAuth]);
}

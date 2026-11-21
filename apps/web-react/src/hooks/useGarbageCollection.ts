import { useEffect } from 'react';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_BOOT_DEFER_MS = 30_000;

type IdleCallbackHandle = number;
type RequestIdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

export function useGarbageCollection(isAuth: boolean, bootDeferMs = DEFAULT_BOOT_DEFER_MS) {
  useEffect(() => {
    if (!isAuth) return;

    const lastRunStr = localStorage.getItem('last_gc_run');
    const lastRun = lastRunStr ? parseInt(lastRunStr, 10) : 0;
    if (Date.now() - lastRun <= SEVEN_DAYS_MS) return;

    let cancelled = false;
    let idleHandle: IdleCallbackHandle | null = null;
    let fallbackIdleTimer: ReturnType<typeof setTimeout> | null = null;

    const runGc = () => {
      if (cancelled) return;
      Promise.allSettled([
        import('../services/image-gc').then((m) => m.runImageGarbageCollector()),
        import('../services/link-vault/link-gc').then((m) => m.runLinkGarbageCollector()),
      ]).then(() => {
        if (!cancelled) {
          localStorage.setItem('last_gc_run', Date.now().toString());
        }
      });
    };

    const timerId = setTimeout(() => {
      if (cancelled) return;
      const win = typeof window !== 'undefined' ? (window as RequestIdleWindow) : undefined;
      if (win?.requestIdleCallback) {
        idleHandle = win.requestIdleCallback(runGc, { timeout: 10_000 });
      } else {
        fallbackIdleTimer = setTimeout(runGc, 0);
      }
    }, bootDeferMs);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
      if (fallbackIdleTimer !== null) {
        clearTimeout(fallbackIdleTimer);
      }
      const win = typeof window !== 'undefined' ? (window as RequestIdleWindow) : undefined;
      if (idleHandle !== null && win?.cancelIdleCallback) {
        win.cancelIdleCallback(idleHandle);
      }
    };
  }, [isAuth, bootDeferMs]);
}

import { useEffect } from 'react';

export function useAppEvents(
  setMovePageId: (id: string | null) => void,
  setIsDriveAuthModalOpen: (open: boolean) => void,
  setFloatingPageId: (id: string | null) => void
) {
  useEffect(() => {
    const handleOpenMove = (e: CustomEvent<{ pageId: string }>) => {
      if (e.detail?.pageId) {
        setMovePageId(e.detail.pageId);
      }
    };
    window.addEventListener('caderno-open-move-page', handleOpenMove as EventListener);
    return () => window.removeEventListener('caderno-open-move-page', handleOpenMove as EventListener);
  }, [setMovePageId]);

  useEffect(() => {
    const handleAuthError = () => setIsDriveAuthModalOpen(true);
    window.addEventListener('drive-auth-expired', handleAuthError);
    return () => window.removeEventListener('drive-auth-expired', handleAuthError);
  }, [setIsDriveAuthModalOpen]);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('[Caderno:GlobalUnhandledRejection]', event.reason);
      const reasonStr = String(event.reason?.message || event.reason || '');
      if (reasonStr.includes('AbortError') || reasonStr.includes('aborted')) {
        return;
      }
      if (reasonStr.includes('Google Drive') || reasonStr.includes('autenticar') || reasonStr.includes('drive-auth')) {
        window.dispatchEvent(new CustomEvent('drive-auth-expired'));
      }
    };

    const handleGlobalError = (event: ErrorEvent) => {
      console.error('[Caderno:GlobalWindowError]', event.error || event.message);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, []);

  // Open Floating Page
  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ pageId: string }>;
      if (customEvent.detail?.pageId) {
        setFloatingPageId(customEvent.detail.pageId);
      }
    };
    window.addEventListener('open-floating-page', handler);
    return () => window.removeEventListener('open-floating-page', handler);
  }, [setFloatingPageId]);
}

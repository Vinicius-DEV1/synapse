import { useState, useEffect, lazy, Suspense, useCallback, memo } from 'react';
import { getStoreState, useStoreDispatch, useStoreSelector } from '../../store/useStore';
import { useI18n } from '../../i18n';
import GlobalFocusOverlays from '../focus/GlobalFocusOverlays';
import BackgroundTaskWidget from './BackgroundTaskWidget';
import { SyncStatusToast } from './SyncStatusToast';
import type { Page } from '../../types';
import type { SyncErrorDetails } from '../modals/SyncErrorModal';
import type { UploadProgressData } from '../library/ui/UploadProgressModal';

// Lazy load heavy and conditional modals — mounted ONLY when activated/open
const GlobalSearchModal = lazy(() => import('../modals/GlobalSearchModal'));
const SyncErrorModal = lazy(() => import('../modals/SyncErrorModal'));
const RenamePageModal = lazy(() => import('../modals/RenamePageModal'));
const ConfirmModal = lazy(() => import('../modals/ConfirmModal'));
const MovePageModal = lazy(() => import('../modals/MovePageModal'));
const FloatingPageModal = lazy(() => import('../modals/FloatingPageModal'));
const DriveAuthModal = lazy(() => import('../library/modals/DriveAuthModal'));
const UploadProgressModal = lazy(() => import('../library/ui/UploadProgressModal').then(m => ({ default: m.UploadProgressModal })));
const ScrapActionModal = lazy(() => import('../modals/ScrapActionModal').then(m => ({ default: m.ScrapActionModal })));
const ScrapViewerModal = lazy(() => import('../modals/ScrapViewerModal').then(m => ({ default: m.ScrapViewerModal })));
const ScrapDeleteModal = lazy(() => import('../modals/ScrapDeleteModal').then(m => ({ default: m.ScrapDeleteModal })));
const ScrapInputModal = lazy(() => import('../modals/ScrapInputModal').then(m => ({ default: m.ScrapInputModal })));
const ShareModal = lazy(() => import('../sharing/ShareModal').then(m => ({ default: m.ShareModal })));
const ShareAccessRequestModal = lazy(() => import('../sharing/ShareAccessRequestModal').then(m => ({ default: m.ShareAccessRequestModal })));
const AccountEvolutionModal = lazy(() => import('../auth/AccountEvolutionModal').then(m => ({ default: m.AccountEvolutionModal })));
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ShareAccessRequestToast } from '../sharing/ShareAccessRequestToast';
import { useShareAccessRequests } from '../../hooks/useShareAccessRequests';

function parseSyncError(detail?: { message?: string; code?: string }): SyncErrorDetails | null {
  if (!detail?.message) return null;
  const { message, code } = detail;
  const lower = message.toLowerCase();
  if (code === 'resource-exhausted' || lower.includes('quota') || lower.includes('exceeded')) {
    return { message, isQuota: true };
  }
  if (lower.includes('permission-denied')) {
    return {
      message: 'Acesso negado ao Firebase. Verifique suas credenciais.',
      isQuota: false,
    };
  }
  return null;
}

interface GlobalConfirmData {
  isOpen: boolean;
  title: string;
  message: string;
  kind?: 'info' | 'warning' | 'error';
  confirmText?: string;
  cancelText?: string;
  resolve: (confirmed: boolean) => void;
}

interface ScrapModalData {
  scrapId: string;
  url: string;
  title: string;
  driveFileId?: string | null;
  onConfirm?: () => void;
  [key: string]: unknown;
}

interface GlobalModalsProps {
  renamePageId: string | null;
  setRenamePageId: (id: string | null) => void;
  movePageId: string | null;
  setMovePageId: (id: string | null) => void;
  floatingPageId: string | null;
  setFloatingPageId: (id: string | null) => void;
  isDriveAuthModalOpen: boolean;
  setIsDriveAuthModalOpen: (open: boolean) => void;
  syncStatus?: 'idle' | 'syncing' | 'success' | 'error';
  handleDeletePage: (id: string) => Promise<void>;
  handleUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  handleUpdateContent: (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[], senderInstanceId?: string) => Promise<void>;
  handleCreatePage: (parentId: string | null) => Promise<void>;
  handleCreateLinkedPage: (title: string, parentId?: string | null) => Promise<string | null>;
}

export const GlobalModals = memo(function GlobalModals({
  renamePageId,
  setRenamePageId,
  movePageId,
  setMovePageId,
  floatingPageId,
  setFloatingPageId,
  isDriveAuthModalOpen,
  setIsDriveAuthModalOpen,
  syncStatus,
  handleDeletePage,
  handleUpdatePage,
  handleUpdateContent,
  handleCreatePage,
  handleCreateLinkedPage,
}: GlobalModalsProps) {
  const dispatch = useStoreDispatch();
  // Subscribe ONLY to narrow flags — NEVER to the entire `pages` array at top level.
  const confirmDelete = useStoreSelector((s) => s.confirmDelete);
  const { t } = useI18n();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [syncError, setSyncError] = useState<SyncErrorDetails | null>(null);
  const [uploadState, setUploadState] = useState<{ active: boolean; progress: UploadProgressData | null }>({
    active: false,
    progress: null,
  });

  const [scrapActionData, setScrapActionData] = useState<ScrapModalData | null>(null);
  const [scrapViewerData, setScrapViewerData] = useState<ScrapModalData | null>(null);
  const [scrapDeleteData, setScrapDeleteData] = useState<ScrapModalData | null>(null);
  const [scrapInputData, setScrapInputData] = useState<{
    isOpen: boolean;
    initialUrl?: string;
    onConfirm?: (url: string) => void;
  } | null>(null);

  const {
    pendingRequests,
    activeModalRequest,
    setActiveModalRequest,
    approveRequest,
    denyRequest,
  } = useShareAccessRequests();

  const [shareModalPageId, setShareModalPageId] = useState<string | null>(null);
  const [isAccountEvolutionOpen, setIsAccountEvolutionOpen] = useState(false);

  // Lightweight shell listeners kept outside lazy chunks so Ctrl+K / sync errors / uploads work on demand
  useEffect(() => {
    let uploadEndTimer: ReturnType<typeof setTimeout> | null = null;
    const clearUploadEndTimer = () => {
      if (uploadEndTimer !== null) {
        clearTimeout(uploadEndTimer);
        uploadEndTimer = null;
      }
    };

    const handleOpenSearch = () => setIsSearchOpen(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    const handleSyncError = (e: Event) => {
      const parsed = parseSyncError((e as CustomEvent<{ message?: string; code?: string }>).detail);
      if (parsed) setSyncError(parsed);
    };
    const handleUploadStart = () => {
      clearUploadEndTimer();
      setUploadState({ active: true, progress: null });
    };
    const handleUploadProgress = (e: Event) => {
      clearUploadEndTimer();
      const detail = (e as CustomEvent<UploadProgressData>).detail;
      setUploadState({ active: true, progress: detail });
    };
    const handleUploadEnd = () => {
      clearUploadEndTimer();
      // Mirrors UploadProgressModal's 1s dismissal so fast uploads finishing before lazy chunk mount still close cleanly
      uploadEndTimer = setTimeout(() => {
        uploadEndTimer = null;
        setUploadState({ active: false, progress: null });
      }, 1000);
    };

    window.addEventListener('open-global-search', handleOpenSearch);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-sync-error', handleSyncError);
    window.addEventListener('library-upload-start', handleUploadStart);
    window.addEventListener('library-upload-progress', handleUploadProgress);
    window.addEventListener('library-upload-end', handleUploadEnd);
    return () => {
      clearUploadEndTimer();
      window.removeEventListener('open-global-search', handleOpenSearch);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-sync-error', handleSyncError);
      window.removeEventListener('library-upload-start', handleUploadStart);
      window.removeEventListener('library-upload-progress', handleUploadProgress);
      window.removeEventListener('library-upload-end', handleUploadEnd);
    };
  }, []);

  useEffect(() => {
    const handleOpenShare = (e: Event) => {
      const customEvent = e as CustomEvent<{ pageId: string }>;
      if (customEvent.detail?.pageId) {
        setShareModalPageId(customEvent.detail.pageId);
      }
    };
    const handleOpenAccountEvolution = () => {
      setIsAccountEvolutionOpen(true);
    };
    window.addEventListener('caderno-open-share-page', handleOpenShare as EventListener);
    window.addEventListener('open-account-evolution', handleOpenAccountEvolution);
    return () => {
      window.removeEventListener('caderno-open-share-page', handleOpenShare as EventListener);
      window.removeEventListener('open-account-evolution', handleOpenAccountEvolution);
    };
  }, []);

  useEffect(() => {
    const handleOpenScrapAction = (e: Event) => {
      const customEvent = e as CustomEvent<ScrapModalData>;
      if (customEvent.detail) {
        setScrapActionData(customEvent.detail);
      }
    };
    const handleRequestScrapDelete = (e: Event) => {
      const customEvent = e as CustomEvent<ScrapModalData>;
      if (customEvent.detail) {
        setScrapDeleteData(customEvent.detail);
      }
    };
    const handleOpenScrapInput = (e: Event) => {
      const customEvent = e as CustomEvent<{ initialUrl?: string; onConfirm?: (url: string) => void }>;
      if (customEvent.detail) {
        setScrapInputData({
          isOpen: true,
          initialUrl: customEvent.detail.initialUrl || '',
          onConfirm: customEvent.detail.onConfirm,
        });
      }
    };
    window.addEventListener('caderno-open-scrap-action', handleOpenScrapAction as EventListener);
    window.addEventListener('caderno-request-scrap-delete', handleRequestScrapDelete as EventListener);
    window.addEventListener('caderno-open-scrap-input', handleOpenScrapInput as EventListener);
    return () => {
      window.removeEventListener('caderno-open-scrap-action', handleOpenScrapAction as EventListener);
      window.removeEventListener('caderno-request-scrap-delete', handleRequestScrapDelete as EventListener);
      window.removeEventListener('caderno-open-scrap-input', handleOpenScrapInput as EventListener);
    };
  }, []);

  const [globalConfirmData, setGlobalConfirmData] = useState<GlobalConfirmData | null>(null);

  useEffect(() => {
    const handleRequestConfirm = (e: Event) => {
      const customEvent = e as CustomEvent<{
        title?: string;
        message: string;
        kind?: 'info' | 'warning' | 'error';
        confirmText?: string;
        cancelText?: string;
        resolve: (confirmed: boolean) => void;
      }>;
      if (customEvent.detail) {
        setGlobalConfirmData({
          isOpen: true,
          title: customEvent.detail.title || 'Confirmação',
          message: customEvent.detail.message,
          kind: customEvent.detail.kind || 'warning',
          confirmText: customEvent.detail.confirmText,
          cancelText: customEvent.detail.cancelText,
          resolve: customEvent.detail.resolve,
        });
      }
    };

    window.addEventListener('caderno-request-confirm', handleRequestConfirm as EventListener);
    return () => {
      window.removeEventListener('caderno-request-confirm', handleRequestConfirm as EventListener);
    };
  }, []);

  const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);
  const handleDismissSyncError = useCallback(() => setSyncError(null), []);
  const handleUploadFinished = useCallback(() => setUploadState({ active: false, progress: null }), []);

  const storeSnapshot = confirmDelete || renamePageId || shareModalPageId || isAccountEvolutionOpen
    ? getStoreState()
    : null;

  return (
    <>
      {/* Always-mounted lightweight overlays kept outside Suspense so lazy modal chunks never hide active toasts/alarms */}
      <SyncStatusToast status={syncStatus} />
      <GlobalFocusOverlays />
      <BackgroundTaskWidget />
      <ShareAccessRequestToast
        requests={pendingRequests}
        onApprove={(req) => approveRequest(req, true)}
        onDeny={(id) => denyRequest(id)}
        onInspect={(req) => setActiveModalRequest(req)}
      />

      {globalConfirmData?.isOpen && (
        <ConfirmDialog
          isOpen={true}
          title={globalConfirmData.title}
          message={globalConfirmData.message}
          variant={globalConfirmData.kind === 'error' ? 'danger' : globalConfirmData.kind === 'info' ? 'info' : 'warning'}
          confirmText={globalConfirmData.confirmText}
          cancelText={globalConfirmData.cancelText}
          onConfirm={() => {
            globalConfirmData.resolve(true);
            setGlobalConfirmData(null);
          }}
          onCancel={() => {
            globalConfirmData.resolve(false);
            setGlobalConfirmData(null);
          }}
        />
      )}

      <Suspense fallback={null}>
        {/* Confirm Delete Modal */}
        {confirmDelete && (
          <ConfirmModal
            pageId={confirmDelete}
            pageName={storeSnapshot?.pages.find((p) => p.id === confirmDelete)?.title || t('modals.confirm.thisPage')}
            onConfirm={() => handleDeletePage(confirmDelete)}
            onCancel={() => dispatch({ type: 'SET_CONFIRM_DELETE', pageId: null })}
          />
        )}

        {/* Rename Page Modal */}
        {renamePageId && (
          <RenamePageModal
            isOpen={true}
            onClose={() => setRenamePageId(null)}
            currentTitle={storeSnapshot?.pages.find((p) => p.id === renamePageId)?.title || ''}
            onRename={(newTitle) => handleUpdatePage(renamePageId, { title: newTitle })}
          />
        )}

        {/* Move Page Modal */}
        {movePageId && (
          <MovePageModal
            isOpen={true}
            pageId={movePageId}
            onClose={() => setMovePageId(null)}
            onMovePage={async (sourceId, targetParentId) => {
              await handleUpdatePage(sourceId, { parent_id: targetParentId });
            }}
          />
        )}

        {/* Sync Error Modal — mounted only on actual sync error */}
        {syncError && (
          <SyncErrorModal initialError={syncError} onDismiss={handleDismissSyncError} />
        )}

        {/* Floating Page Modal */}
        {floatingPageId && (
          <FloatingPageModal
            pageId={floatingPageId}
            onClose={() => setFloatingPageId(null)}
            onExpand={(id) => {
              setFloatingPageId(null);
              dispatch({ type: 'NAVIGATE_IN_TAB', pageId: id });
            }}
            onUpdateContent={handleUpdateContent}
            onCreatePage={handleCreatePage}
            onCreateLinkedPage={handleCreateLinkedPage}
            onUpdatePage={handleUpdatePage}
          />
        )}

        {/* Global Search Modal — mounted only when opened via Ctrl+K or event */}
        {isSearchOpen && (
          <GlobalSearchModal initialOpen={true} onRequestClose={handleCloseSearch} />
        )}

        {/* Drive Auth Modal */}
        {isDriveAuthModalOpen && (
          <DriveAuthModal
            onClose={() => setIsDriveAuthModalOpen(false)}
            onSuccess={() => setIsDriveAuthModalOpen(false)}
          />
        )}

        {/* Scrap Modals (Mount only when data is present) */}
        {scrapActionData && (
          <ScrapActionModal
            isOpen={true}
            onClose={() => setScrapActionData(null)}
            onOpenViewer={() => {
              setScrapViewerData(scrapActionData);
              setScrapActionData(null);
            }}
            scrapData={scrapActionData}
          />
        )}

        {scrapViewerData && (
          <ScrapViewerModal
            isOpen={true}
            onClose={() => setScrapViewerData(null)}
            scrapData={scrapViewerData}
          />
        )}

        {scrapDeleteData && (
          <ScrapDeleteModal
            isOpen={true}
            onClose={() => setScrapDeleteData(null)}
            onConfirmDelete={() => {
              if (scrapDeleteData?.onConfirm) {
                scrapDeleteData.onConfirm();
              }
              setScrapDeleteData(null);
            }}
            scrapData={scrapDeleteData}
          />
        )}

        {scrapInputData?.isOpen && (
          <ScrapInputModal
            isOpen={true}
            initialUrl={scrapInputData?.initialUrl}
            onClose={() => setScrapInputData(null)}
            onConfirm={(url) => {
              if (scrapInputData?.onConfirm) {
                scrapInputData.onConfirm(url);
              }
              setScrapInputData(null);
            }}
          />
        )}

        {/* Upload Progress Modal — mounted only during active upload */}
        {uploadState.active && (
          <UploadProgressModal
            initialVisible={true}
            initialProgress={uploadState.progress}
            onFinished={handleUploadFinished}
          />
        )}

        {activeModalRequest && (
          <ShareAccessRequestModal
            request={activeModalRequest}
            onClose={() => setActiveModalRequest(null)}
            onApprove={(req, trust) => approveRequest(req, trust)}
            onDeny={(id) => denyRequest(id)}
          />
        )}

        {/* Share Configuration Modal triggered via ContextMenu or Events */}
        {shareModalPageId && (() => {
          const sharePage = storeSnapshot?.pages.find((p) => p.id === shareModalPageId);
          return sharePage ? (
            <ShareModal
              page={sharePage}
              isOpen={true}
              onClose={() => setShareModalPageId(null)}
              masterKey={storeSnapshot?.moduleKeys?.notes}
            />
          ) : null;
        })()}

        {/* Account Evolution Modal — mounted only when explicitly opened */}
        {isAccountEvolutionOpen && (
          <AccountEvolutionModal
            isOpen={true}
            onClose={() => setIsAccountEvolutionOpen(false)}
            moduleKeys={storeSnapshot?.moduleKeys || {}}
            masterKey={storeSnapshot?.masterKey || null}
          />
        )}
      </Suspense>
    </>
  );
});

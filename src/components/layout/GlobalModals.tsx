import { useState, useEffect, lazy, Suspense } from 'react';
import { useStore } from '../../store/useStore';
import GlobalFocusOverlays from '../focus/GlobalFocusOverlays';
import GlobalSearchModal from '../modals/GlobalSearchModal';
import BackgroundTaskWidget from './BackgroundTaskWidget';
import { SyncStatusToast } from './SyncStatusToast';
import { UploadProgressModal } from '../library/ui/UploadProgressModal';
import SyncErrorModal from '../modals/SyncErrorModal';
import type { Page } from '../../types';

// Lazy load heavy and conditional modals to keep initial bundle ultra-light
const ConfirmModal = lazy(() => import('../modals/ConfirmModal'));
const RenamePageModal = lazy(() => import('../modals/RenamePageModal'));
const MovePageModal = lazy(() => import('../modals/MovePageModal'));
const FloatingPageModal = lazy(() => import('../modals/FloatingPageModal'));
const DriveAuthModal = lazy(() => import('../library/modals/DriveAuthModal'));
const ScrapActionModal = lazy(() => import('../modals/ScrapActionModal').then(m => ({ default: m.ScrapActionModal })));
const ScrapViewerModal = lazy(() => import('../modals/ScrapViewerModal').then(m => ({ default: m.ScrapViewerModal })));
const ScrapDeleteModal = lazy(() => import('../modals/ScrapDeleteModal').then(m => ({ default: m.ScrapDeleteModal })));
const ScrapInputModal = lazy(() => import('../modals/ScrapInputModal').then(m => ({ default: m.ScrapInputModal })));
const ShareModal = lazy(() => import('../sharing/ShareModal').then(m => ({ default: m.ShareModal })));
import { ShareAccessRequestToast } from '../sharing/ShareAccessRequestToast';
import { ShareAccessRequestModal } from '../sharing/ShareAccessRequestModal';
import { useShareAccessRequests } from '../../hooks/useShareAccessRequests';

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
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  handleDeletePage: (id: string) => Promise<void>;
  handleUpdatePage: (id: string, updates: Partial<Page>) => Promise<void>;
  handleUpdateContent: (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[], senderInstanceId?: string) => Promise<void>;
  handleCreatePage: (parentId: string | null) => Promise<void>;
  handleCreateLinkedPage: (title: string, parentId?: string | null) => Promise<string | null>;
}

export function GlobalModals({
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
  const { state, dispatch } = useStore();

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

  useEffect(() => {
    const handleOpenShare = (e: Event) => {
      const customEvent = e as CustomEvent<{ pageId: string }>;
      if (customEvent.detail?.pageId) {
        setShareModalPageId(customEvent.detail.pageId);
      }
    };
    window.addEventListener('caderno-open-share-page', handleOpenShare as EventListener);
    return () => {
      window.removeEventListener('caderno-open-share-page', handleOpenShare as EventListener);
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

  return (
    <Suspense fallback={null}>
      {/* Confirm Delete Modal */}
      {state.confirmDelete && (
        <ConfirmModal
          pageId={state.confirmDelete}
          pageName={state.pages.find((p) => p.id === state.confirmDelete)?.title || 'esta página'}
          onConfirm={() => handleDeletePage(state.confirmDelete!)}
          onCancel={() => dispatch({ type: 'SET_CONFIRM_DELETE', pageId: null })}
        />
      )}

      {/* Rename Page Modal */}
      {renamePageId && (
        <RenamePageModal
          isOpen={!!renamePageId}
          onClose={() => setRenamePageId(null)}
          currentTitle={state.pages.find((p) => p.id === renamePageId)?.title || ''}
          onRename={(newTitle) => handleUpdatePage(renamePageId, { title: newTitle })}
        />
      )}

      {/* Move Page Modal */}
      {movePageId && (
        <MovePageModal
          isOpen={!!movePageId}
          pageId={movePageId}
          onClose={() => setMovePageId(null)}
          onMovePage={async (sourceId, targetParentId) => {
            await handleUpdatePage(sourceId, { parent_id: targetParentId });
          }}
        />
      )}

      {/* Sync Status Toast */}
      <SyncStatusToast status={syncStatus} />

      {/* Sync Error Modal */}
      <SyncErrorModal />

      {/* Focus Overlays */}
      <GlobalFocusOverlays />

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

      {/* Global Search Modal */}
      <GlobalSearchModal />

      {/* Drive Auth Modal */}
      {isDriveAuthModalOpen && (
        <DriveAuthModal
          onClose={() => setIsDriveAuthModalOpen(false)}
          onSuccess={() => setIsDriveAuthModalOpen(false)}
        />
      )}

      {/* Background Tasks Widget */}
      <BackgroundTaskWidget />

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

      <UploadProgressModal />

      {/* Real-time Gated Access Toasts & Inspection Modal */}
      <ShareAccessRequestToast
        requests={pendingRequests}
        onApprove={(req) => approveRequest(req, true)}
        onDeny={(id) => denyRequest(id)}
        onInspect={(req) => setActiveModalRequest(req)}
      />

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
        const sharePage = state.pages.find((p) => p.id === shareModalPageId);
        return sharePage ? (
          <ShareModal
            page={sharePage}
            isOpen={true}
            onClose={() => setShareModalPageId(null)}
            masterKey={state.moduleKeys?.notes}
          />
        ) : null;
      })()}
    </Suspense>
  );
}

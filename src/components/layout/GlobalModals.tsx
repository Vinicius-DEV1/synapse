import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import ConfirmModal from '../modals/ConfirmModal';
import RenamePageModal from '../modals/RenamePageModal';
import MovePageModal from '../modals/MovePageModal';
import SyncErrorModal from '../modals/SyncErrorModal';
import GlobalFocusOverlays from '../focus/GlobalFocusOverlays';
import FloatingPageModal from '../modals/FloatingPageModal';
import GlobalSearchModal from '../modals/GlobalSearchModal';
import DriveAuthModal from '../library/modals/DriveAuthModal';
import BackgroundTaskWidget from './BackgroundTaskWidget';
import { SyncStatusToast } from './SyncStatusToast';
import { ScrapActionModal } from '../modals/ScrapActionModal';
import { ScrapViewerModal } from '../modals/ScrapViewerModal';
import { ScrapDeleteModal } from '../modals/ScrapDeleteModal';
import { ScrapInputModal } from '../modals/ScrapInputModal';
import { UploadProgressModal } from '../library/ui/UploadProgressModal';

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
  handleDeletePage: (id: string) => void;
  handleUpdatePage: (id: string, updates: any) => void;
  handleUpdateContent: (id: string, content: string, crdtState: string | null, embeddedSaves?: {id: string, content: string}[]) => void;
  handleCreatePage: (parentId: string | null) => void;
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

  const [scrapActionData, setScrapActionData] = useState<any | null>(null);
  const [scrapViewerData, setScrapViewerData] = useState<any | null>(null);
  const [scrapDeleteData, setScrapDeleteData] = useState<any | null>(null);
  const [scrapInputData, setScrapInputData] = useState<{
    isOpen: boolean;
    initialUrl?: string;
    onConfirm?: (url: string) => void;
  } | null>(null);

  useEffect(() => {
    const handleOpenScrapAction = (e: CustomEvent) => {
      if (e.detail) {
        setScrapActionData(e.detail);
      }
    };
    const handleRequestScrapDelete = (e: CustomEvent) => {
      if (e.detail) {
        setScrapDeleteData(e.detail);
      }
    };
    const handleOpenScrapInput = (e: CustomEvent) => {
      if (e.detail) {
        setScrapInputData({
          isOpen: true,
          initialUrl: e.detail.initialUrl || '',
          onConfirm: e.detail.onConfirm,
        });
      }
    };
    window.addEventListener('caderno-open-scrap-action' as any, handleOpenScrapAction as any);
    window.addEventListener('caderno-request-scrap-delete' as any, handleRequestScrapDelete as any);
    window.addEventListener('caderno-open-scrap-input' as any, handleOpenScrapInput as any);
    return () => {
      window.removeEventListener('caderno-open-scrap-action' as any, handleOpenScrapAction as any);
      window.removeEventListener('caderno-request-scrap-delete' as any, handleRequestScrapDelete as any);
      window.removeEventListener('caderno-open-scrap-input' as any, handleOpenScrapInput as any);
    };
  }, []);

  return (
    <>
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

      {/* Scrap Modals (Single Global Host) */}
      <ScrapActionModal
        isOpen={!!scrapActionData}
        onClose={() => setScrapActionData(null)}
        onOpenViewer={() => {
          setScrapViewerData(scrapActionData);
          setScrapActionData(null);
        }}
        scrapData={scrapActionData}
      />

      <ScrapViewerModal
        isOpen={!!scrapViewerData}
        onClose={() => setScrapViewerData(null)}
        scrapData={scrapViewerData}
      />

      <ScrapDeleteModal
        isOpen={!!scrapDeleteData}
        onClose={() => setScrapDeleteData(null)}
        onConfirmDelete={() => {
          if (scrapDeleteData?.onConfirm) {
            scrapDeleteData.onConfirm();
          }
          setScrapDeleteData(null);
        }}
        scrapData={scrapDeleteData}
      />

      <ScrapInputModal
        isOpen={!!scrapInputData?.isOpen}
        initialUrl={scrapInputData?.initialUrl}
        onClose={() => setScrapInputData(null)}
        onConfirm={(url) => {
          if (scrapInputData?.onConfirm) {
            scrapInputData.onConfirm(url);
          }
          setScrapInputData(null);
        }}
      />

      <UploadProgressModal />
    </>
  );
}

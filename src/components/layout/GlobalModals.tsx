import { useStore } from '../../store/useStore';
import ConfirmModal from '../ConfirmModal';
import RenamePageModal from '../RenamePageModal';
import MovePageModal from '../modals/MovePageModal';
import SyncErrorModal from '../SyncErrorModal';
import GlobalFocusOverlays from '../focus/GlobalFocusOverlays';
import FloatingPageModal from '../FloatingPageModal';
import GlobalSearchModal from '../GlobalSearchModal';
import DriveAuthModal from '../library/DriveAuthModal';
import BackgroundTaskWidget from './BackgroundTaskWidget';
import { SyncStatusToast } from './SyncStatusToast';

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
    </>
  );
}

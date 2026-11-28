import { lazy, Suspense } from 'react';
import type { VideoItem } from '../../../types';
import type { UploadOptions } from '../VideoUploadModal';

const VideoUploadModal = lazy(() => import('../VideoUploadModal'));
const YouTubeDownloadModal = lazy(() => import('../YouTubeDownloadModal'));
const WebVersionModal = lazy(() => import('../WebVersionModal'));

interface VideoViewModalsProps {
  showUploadModal: boolean;
  onCloseUploadModal: () => void;
  onUpload: (options: UploadOptions) => Promise<void> | void;
  selectedFolderId: string | null;
  selectedFolderName: string | null;
  showYoutubeModal: boolean;
  onCloseYoutubeModal: () => void;
  onYoutubeSuccess: () => void;
  webVersionVideo: VideoItem | null;
  onCloseWebVersionModal: () => void;
  onConfirmWebVersion: (quality: string) => Promise<void>;
}

export function VideoViewModals({
  showUploadModal,
  onCloseUploadModal,
  onUpload,
  selectedFolderId,
  selectedFolderName,
  showYoutubeModal,
  onCloseYoutubeModal,
  onYoutubeSuccess,
  webVersionVideo,
  onCloseWebVersionModal,
  onConfirmWebVersion
}: VideoViewModalsProps) {
  return (
    <Suspense fallback={null}>
      {showUploadModal && (
        <VideoUploadModal 
          collectionId={selectedFolderId || undefined}
          collectionName={selectedFolderName || undefined}
          onClose={onCloseUploadModal}
          onUpload={onUpload}
        />
      )}
      
      {showYoutubeModal && (
        <YouTubeDownloadModal 
          onClose={onCloseYoutubeModal}
          onSuccess={onYoutubeSuccess}
        />
      )}

      {webVersionVideo && (
        <WebVersionModal
          isOpen={true}
          onClose={onCloseWebVersionModal}
          onConfirm={onConfirmWebVersion}
          videoTitle={webVersionVideo.title || ''}
        />
      )}
    </Suspense>
  );
}

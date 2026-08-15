import React from 'react';
import type { VideoItem } from '../../../types';
import VideoUploadModal, { type UploadOptions } from '../VideoUploadModal';
import YouTubeDownloadModal from '../YouTubeDownloadModal';
import WebVersionModal from '../WebVersionModal';

interface VideoViewModalsProps {
  showUploadModal: boolean;
  onCloseUploadModal: () => void;
  onUpload: (options: UploadOptions) => Promise<any>;
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
    <>
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

      <WebVersionModal
        isOpen={!!webVersionVideo}
        onClose={onCloseWebVersionModal}
        onConfirm={onConfirmWebVersion}
        videoTitle={webVersionVideo?.title || ''}
      />
    </>
  );
}

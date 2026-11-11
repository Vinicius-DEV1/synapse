import { useState } from 'react';
import type { VideoItem } from '../../types';
import { Cloud, ArrowLeft } from 'lucide-react';
import VideoInfoModal from './VideoInfoModal';
import { VideoCard } from './ui/VideoCard';
import { useVideoCollections } from './hooks/useVideoCollections';
import { VideoFolderCard, NewFolderCard } from './ui/VideoFolderCard';

interface VideoGridProps {
  videos: VideoItem[];
  viewMode?: 'grid' | 'list' | 'compact';
  onPlayVideo: (video: VideoItem) => void;
  onDownloadVideo: (video: VideoItem) => void;
  onDeleteLocal: (video: VideoItem) => void;
  onDeleteCloud: (video: VideoItem) => void;
  onMoveVideo?: (video: VideoItem, folderId: string | null, folderName: string | null) => void;
  isDeletingId?: string | null;
  isDownloadingId?: string | null;
  downloadProgress?: number;
  folders?: { id: string; name: string }[];
  onCreateFolder?: (name: string) => void;
  onRenameFolder?: (id: string, newName: string) => void;
  onDeleteFolder?: (id: string) => void;
  onActiveCollectionChange?: (id: string | null, name: string | null) => void;
  onGenerateWebVersion?: (video: VideoItem) => void;
}

export default function VideoGrid({
  videos,
  viewMode = 'grid',
  onPlayVideo,
  onDownloadVideo,
  onDeleteLocal,
  onDeleteCloud,
  onMoveVideo,
  isDeletingId,
  isDownloadingId,
  downloadProgress,
  folders = [],
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onActiveCollectionChange,
  onGenerateWebVersion,
}: VideoGridProps) {
  const [activeInfoVideo, setActiveInfoVideo] = useState<VideoItem | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const isList = viewMode === 'list' || viewMode === 'compact';
  const isCompact = viewMode === 'compact';

  const {
    activeCollectionId,
    activeCollectionName,
    displayVideos,
    mergedCollections,
    availableFolders,
    handleSelectCollection,
  } = useVideoCollections(videos, folders, onActiveCollectionChange);

  const handleRenameSubmit = (folderId: string) => {
    const trimmed = renameValue.trim();
    if (trimmed && onRenameFolder) {
      onRenameFolder(folderId, trimmed);
    }
    setRenamingFolderId(null);
    setRenameValue('');
  };

  const handleCreateFolderSubmit = () => {
    const trimmed = newFolderName.trim();
    if (trimmed && onCreateFolder) {
      onCreateFolder(trimmed);
    }
    setIsCreatingFolder(false);
    setNewFolderName('');
  };

  return (
    <div className="flex flex-col">
      {activeCollectionId && (
        <div className="px-6 py-3 flex items-center gap-2 text-brand-400 bg-brand-500/5 border-b border-brand-500/10">
          <button
            onClick={() => handleSelectCollection(null, null)}
            className="flex items-center gap-2 hover:text-brand-300 transition-colors font-medium text-sm focus:outline-none"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
          <span className="text-white/30 text-sm">/</span>
          <span className="text-white/80 text-sm">{activeCollectionName}</span>
        </div>
      )}

      <div
        className={
          isList
            ? 'flex flex-col gap-2 p-4'
            : 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4'
        }
      >
        {/* New Folder Button + Inline Creation */}
        {!activeCollectionId && (
          <NewFolderCard
            isCreating={isCreatingFolder}
            isList={isList}
            isCompact={isCompact}
            newFolderName={newFolderName}
            onNameChange={setNewFolderName}
            onSubmit={handleCreateFolderSubmit}
            onCancel={() => {
              setIsCreatingFolder(false);
              setNewFolderName('');
            }}
            onStartCreate={() => setIsCreatingFolder(true)}
          />
        )}

        {/* Render Collections (Folders) */}
        {!activeCollectionId &&
          mergedCollections.map((col) => (
            <VideoFolderCard
              key={col.id}
              collection={col}
              isList={isList}
              isCompact={isCompact}
              isRenaming={renamingFolderId === col.id}
              renameValue={renameValue}
              onRenameChange={setRenameValue}
              onRenameSubmit={handleRenameSubmit}
              onCancelRename={() => {
                setRenamingFolderId(null);
                setRenameValue('');
              }}
              onStartRename={(c) => {
                setRenameValue(c.name);
                setRenamingFolderId(c.id);
              }}
              onSelect={(id, name) => {
                if (renamingFolderId !== id) handleSelectCollection(id, name);
              }}
              onDelete={onDeleteFolder}
            />
          ))}

        {/* Render Videos */}
        {displayVideos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            viewMode={viewMode}
            isDeleting={isDeletingId === video.id}
            isDownloading={isDownloadingId === video.id}
            downloadProgress={downloadProgress}
            availableFolders={availableFolders}
            onPlayVideo={onPlayVideo}
            onDownloadVideo={onDownloadVideo}
            onDeleteLocal={onDeleteLocal}
            onDeleteCloud={onDeleteCloud}
            onMoveVideo={onMoveVideo}
            onShowInfo={setActiveInfoVideo}
            onGenerateWebVersion={onGenerateWebVersion}
          />
        ))}

        {videos.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-dark-subtext">
            <Cloud size={48} className="mb-4 opacity-20" />
            <p>Nenhum vídeo importado ainda.</p>
          </div>
        )}
      </div>

      {activeInfoVideo && (
        <VideoInfoModal
          video={activeInfoVideo}
          onClose={() => setActiveInfoVideo(null)}
          onVideoUpdated={(updated) => setActiveInfoVideo(updated)}
          onPlayVideo={onPlayVideo}
        />
      )}
    </div>
  );
}

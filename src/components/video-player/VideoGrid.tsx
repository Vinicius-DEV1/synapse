import React, { useState, useRef, useEffect } from 'react';
import type { VideoItem } from '../../types';
import { Play, Cloud, HardDrive, Download, Trash2, MoreVertical, Folder, ArrowLeft, Info, FolderPlus, Pencil, FolderInput } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import VideoInfoModal from './VideoInfoModal';
import { VideoCard } from './ui/VideoCard';

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

interface VideoCollection {
  id: string;
  name: string;
  count: number;
  totalDuration: number;
  videos: VideoItem[];
}

export default function VideoGrid({ 
  videos, viewMode = 'grid', onPlayVideo, onDownloadVideo, onDeleteLocal, onDeleteCloud, 
  onMoveVideo, isDeletingId, isDownloadingId, downloadProgress,
  folders = [], onCreateFolder, onRenameFolder, onDeleteFolder, onActiveCollectionChange,
  onGenerateWebVersion
}: VideoGridProps) {
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [activeInfoVideo, setActiveInfoVideo] = useState<VideoItem | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renamingFolderId && renameInputRef.current) renameInputRef.current.focus();
  }, [renamingFolderId]);

  useEffect(() => {
    if (isCreatingFolder && newFolderInputRef.current) newFolderInputRef.current.focus();
  }, [isCreatingFolder]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isList = viewMode === 'list' || viewMode === 'compact';
  const isCompact = viewMode === 'compact';

  // Group videos by collection
  const collectionsMap = new Map<string, VideoCollection>();
  const standaloneVideos: VideoItem[] = [];

  videos.forEach(v => {
    if (v.collection_id) {
      if (!collectionsMap.has(v.collection_id)) {
        collectionsMap.set(v.collection_id, {
          id: v.collection_id,
          name: v.collection_name || 'Playlist',
          count: 0,
          totalDuration: 0,
          videos: []
        });
      }
      const c = collectionsMap.get(v.collection_id)!;
      c.count++;
      c.totalDuration += (v.duration || 0);
      c.videos.push(v);
    } else {
      standaloneVideos.push(v);
    }
  });

  // Merge DB folders with collections derived from videos
  const allFolderIds = new Set<string>();
  folders.forEach(f => allFolderIds.add(f.id));
  collectionsMap.forEach((_, id) => allFolderIds.add(id));

  const mergedCollections: VideoCollection[] = [];
  allFolderIds.forEach(id => {
    const fromMap = collectionsMap.get(id);
    const fromFolder = folders.find(f => f.id === id);
    mergedCollections.push({
      id,
      name: fromFolder?.name || fromMap?.name || 'Pasta',
      count: fromMap?.count || 0,
      totalDuration: fromMap?.totalDuration || 0,
      videos: fromMap?.videos || []
    });
  });

  const displayVideos = activeCollectionId ? (collectionsMap.get(activeCollectionId)?.videos || []) : standaloneVideos;
  const activeCollectionName = activeCollectionId ? (mergedCollections.find(c => c.id === activeCollectionId)?.name || '') : '';

  const handleSelectCollection = (id: string | null, name: string | null = null) => {
    setActiveCollectionId(id);
    if (onActiveCollectionChange) {
      if (!id) {
        onActiveCollectionChange(null, null);
      } else {
        const colName = name || mergedCollections.find(c => c.id === id)?.name || null;
        onActiveCollectionChange(id, colName);
      }
    }
  };

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

  // All available folders for "move to" submenu
  const availableFolders = mergedCollections.filter(c => c.id !== activeCollectionId);

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

      <div className={isList ? "flex flex-col gap-2 p-4" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4"}>
        
        {/* New Folder Button + Inline Creation */}
        {!activeCollectionId && (
          <>
            {isCreatingFolder ? (
              <div className={`bg-white/5 border border-brand-500/30 rounded-xl overflow-hidden ${isList ? 'flex items-center p-2 gap-4' : 'flex-col'}`}>
                {!isCompact && (
                  <div className={`${isList ? 'w-40 flex-shrink-0 rounded-lg overflow-hidden' : 'w-full'} aspect-video bg-black/40 relative flex items-center justify-center`}>
                    <div className="w-full h-full bg-gradient-to-tr from-brand-900/40 to-brand-500/10 absolute inset-0"></div>
                    <FolderPlus size={32} className="text-brand-400 opacity-80 relative z-10" />
                  </div>
                )}
                <div className={`${isList ? 'flex-1 p-2' : 'p-3'} flex items-center gap-2`}>
                  {isCompact && <FolderPlus size={20} className="text-brand-400 ml-1 mr-2 flex-shrink-0" />}
                  <input
                    ref={newFolderInputRef}
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolderSubmit();
                      if (e.key === 'Escape') { setIsCreatingFolder(false); setNewFolderName(''); }
                    }}
                    onBlur={handleCreateFolderSubmit}
                    placeholder="Nome da pasta..."
                    className="flex-1 bg-transparent border-b border-brand-500/50 text-white text-sm py-1 px-1 focus:outline-none focus:border-brand-400 placeholder:text-white/30"
                  />
                </div>
              </div>
            ) : (
              <div
                onClick={() => setIsCreatingFolder(true)}
                className={`cursor-pointer group bg-white/[0.02] border border-dashed border-white/10 hover:border-brand-500/30 rounded-xl overflow-hidden transition-all duration-300 ${isList ? 'flex items-center p-2 gap-4' : 'flex-col'}`}
              >
                {!isCompact && (
                  <div className={`${isList ? 'w-40 flex-shrink-0 rounded-lg overflow-hidden' : 'w-full'} aspect-video bg-transparent relative flex items-center justify-center`}>
                    <FolderPlus size={28} className="text-white/20 group-hover:text-brand-400/60 transition-colors" />
                  </div>
                )}
                <div className={`${isList ? 'flex-1 p-2' : 'p-3'} flex items-center gap-2`}>
                  {isCompact && <FolderPlus size={20} className="text-white/20 group-hover:text-brand-400/60 ml-1 mr-2 flex-shrink-0 transition-colors" />}
                  <span className="text-white/30 group-hover:text-white/60 text-xs font-medium transition-colors">Nova Pasta</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Render Collections (Folders) */}
        {!activeCollectionId && mergedCollections.map(col => (
          <div 
            key={col.id}
            className={`cursor-pointer group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all duration-300 ${isList ? 'hover:bg-white/10 flex items-center p-2 gap-4' : 'hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1 flex-col'}`}
          >
            {!isCompact && (
              <div 
                className={`${isList ? 'w-40 flex-shrink-0 rounded-lg overflow-hidden' : 'w-full'} aspect-video bg-black/40 relative flex items-center justify-center`}
                onClick={() => handleSelectCollection(col.id, col.name)}
              >
                <div className="w-full h-full bg-gradient-to-tr from-brand-900/40 to-brand-500/10 absolute inset-0"></div>
                <Folder size={32} className="text-brand-400 opacity-80 group-hover:scale-110 transition-transform relative z-10" />
                <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium text-white tracking-wider backdrop-blur-md z-10 border border-white/10">
                  {col.count} {col.count === 1 ? 'vídeo' : 'vídeos'}
                </div>
              </div>
            )}
            
            <div 
              className={`${isList ? 'flex-1 p-2' : 'p-3'} flex items-center justify-between gap-2`}
              onClick={() => { if (renamingFolderId !== col.id) handleSelectCollection(col.id, col.name); }}
            >
              {isCompact && (
                <div className="flex-shrink-0 text-brand-500 opacity-80 group-hover:opacity-100 transition-opacity" onClick={() => handleSelectCollection(col.id, col.name)}>
                  <Folder size={20} className="ml-1 mr-2" />
                </div>
              )}
              <div className="flex-1 overflow-hidden" onClick={() => { if (renamingFolderId !== col.id) handleSelectCollection(col.id, col.name); }}>
                {renamingFolderId === col.id ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') handleRenameSubmit(col.id);
                      if (e.key === 'Escape') { setRenamingFolderId(null); setRenameValue(''); }
                    }}
                    onBlur={() => handleRenameSubmit(col.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-transparent border-b border-brand-500/50 text-white text-sm py-0.5 px-0 w-full focus:outline-none focus:border-brand-400"
                  />
                ) : (
                  <>
                    <h3 className={`text-white font-medium truncate ${isList ? 'text-sm' : 'text-xs'}`} title={col.name}>
                      {col.name}
                    </h3>
                    {(isList && !isCompact) && (
                      <p className="text-xs text-brand-400/80 mt-1">
                        {col.count} {col.count === 1 ? 'vídeo' : 'vídeos'}
                      </p>
                    )}
                  </>
                )}
              </div>
              {isCompact && (
                <div className="text-xs font-medium text-brand-400/80 bg-brand-500/10 px-2 py-1 rounded mr-2">
                  {col.count}
                </div>
              )}

              {/* Folder Context Menu */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button 
                    className="text-white/40 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors focus:outline-none flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical size={14} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content 
                    className="z-50 min-w-[160px] bg-dark-card border border-white/10 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                    sideOffset={5}
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu.Item 
                      className="flex items-center gap-2 px-2 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-colors"
                      onSelect={() => {
                        setRenameValue(col.name);
                        setRenamingFolderId(col.id);
                      }}
                    >
                      <Pencil size={14} />
                      Renomear
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="h-px bg-white/10 my-1 mx-1" />
                    <DropdownMenu.Item 
                      className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg cursor-pointer outline-none transition-colors"
                      onSelect={() => {
                        if (onDeleteFolder) onDeleteFolder(col.id);
                      }}
                    >
                      <Trash2 size={14} />
                      Excluir pasta
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>
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
        />
      )}
    </div>
  );
}

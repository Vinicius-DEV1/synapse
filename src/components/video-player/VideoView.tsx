import React, { useState, useEffect } from 'react';
import type { VideoItem } from '../../types_video';
import VideoGrid from './VideoGrid';
import VideoPlayer from './VideoPlayer';
import VideoUploadModal, { type UploadOptions } from './VideoUploadModal';
import YouTubeDownloadModal from './YouTubeDownloadModal';
import { resolveVideoUrl, uploadNewVideo, downloadVideoToLocal, getSubtitleText, deleteVideoAndSync } from '../../services/video-manager';
import { PlaySquare, Plus, LayoutGrid, List, AlignJustify, MonitorPlay } from 'lucide-react';

export default function VideoView() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>(() => {
    return (localStorage.getItem('videoViewMode') as any) || 'grid';
  });
  
  // Player state
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string | null>(null);
  const [activeSubtitle, setActiveSubtitle] = useState<string | undefined>();
  const [playerError, setPlayerError] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
    
    // Subscribe to sync changes
    let unsubscribe = () => {};
    if (window.api?.onSyncTrigger) {
      unsubscribe = window.api.onSyncTrigger(() => loadVideos());
    }
    return () => unsubscribe();
  }, []);

  const loadVideos = async () => {
    try {
      if (window.api?.sync) {
        const rows = await window.api.sync.getTable('videos');
        setVideos(rows as VideoItem[]);
      }
    } catch (e) {
      console.error('Failed to load videos:', e);
    }
  };

  const handlePlayVideo = async (video: VideoItem) => {
    try {
      setPlayerError(null);
      
      // Load subtitles - try saved subtitle first
      let subText = await getSubtitleText(video.drive_subtitle_id, video.local_subtitle_path);
      
      // If no saved subtitle but video is local, try extracting embedded subtitles on-the-fly
      if (!subText && video.is_local && video.file_path && window.api?.video) {
        try {
          const localPath = await window.api.video.getLocalPath(video.original_name);
          if (localPath) {
            const scanResult = await (window.api.video as any).scanTracks(localPath);
            if (scanResult?.subtitles?.length > 0) {
              const firstSub = scanResult.subtitles[0];
              const extracted = await window.api.video.extractSubtitles(localPath, firstSub.index);
              if (extracted) subText = extracted;
            }
          }
        } catch (e) {
          console.warn("Falha ao extrair legenda embutida:", e);
        }
      }
      
      if (subText) setActiveSubtitle(subText);
      else setActiveSubtitle(undefined);

      // Resolve URL (local vs drive stream)
      const src = await resolveVideoUrl(video);
      setActiveVideoSrc(src);
      setActiveVideo(video);
    } catch (e: any) {
      console.error(e);
      setPlayerError(e.message || 'Erro ao carregar o vídeo.');
    }
  };

  const handleUpload = async (options: UploadOptions) => {
    setIsUploading(true);
    try {
      await uploadNewVideo(options);
      await loadVideos();
    } finally {
      setIsUploading(false);
    }
  };

  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  const handleDownload = async (video: VideoItem) => {
    setIsDownloadingId(video.id);
    setDownloadProgress(0);
    try {
      await downloadVideoToLocal(video, (percent) => {
        setDownloadProgress(Math.round(percent));
      });
      await loadVideos();
    } catch (e) {
      console.error("Erro ao baixar:", e);
      alert("Erro ao baixar o vídeo para uso local.");
    } finally {
      setIsDownloadingId(null);
    }
  };

  const handleDeleteLocal = async (video: VideoItem) => {
    const confirm = window.api?.app?.showConfirm ? 
      await window.api.app.showConfirm(`Tem certeza que deseja excluir '${video.title}' localmente? Ele ainda estará no Drive.`) 
      : 1;
      
    if (confirm !== 1) return;

    setIsDeletingId(video.id);
    try {
      if (window.api?.video) {
        await window.api.video.deleteLocal(video.original_name);
        await window.api.sync.upsertRow('videos', {
          ...video,
          is_local: false,
          file_path: null,
          updated_at: new Date().toISOString()
        });
        await loadVideos();
      }
    } catch (e) {
      console.error("Erro ao excluir localmente", e);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleDeleteCloud = async (video: VideoItem) => {
    const confirm = window.api?.app?.showConfirm ? 
      await window.api.app.showConfirm(`Tem certeza que deseja apagar permanentemente '${video.title}'? O arquivo local e os do Google Drive serão excluídos.`) 
      : 1;

    if (confirm !== 1) return;

    setIsDeletingId(video.id);
    try {
      await deleteVideoAndSync(video);
      await loadVideos();
    } catch(e) {
      console.error("Erro ao excluir da nuvem", e);
    } finally {
      setIsDeletingId(null);
    }
  };

  // ===== Folder Management =====
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);

  const loadFolders = async () => {
    try {
      if (window.api?.config) {
        const data = await window.api.config.get('videoFolders');
        if (Array.isArray(data)) setFolders(data);
      }
    } catch (e) {
      console.error('Failed to load folders:', e);
    }
  };

  const saveFolders = async (newFolders: { id: string; name: string }[]) => {
    setFolders(newFolders);
    if (window.api?.config) {
      await window.api.config.set('videoFolders', newFolders);
    }
  };

  useEffect(() => { loadFolders(); }, []);

  const handleCreateFolder = (name: string) => {
    const newFolder = { id: crypto.randomUUID(), name };
    saveFolders([...folders, newFolder]);
  };

  const handleRenameFolder = async (id: string, newName: string) => {
    saveFolders(folders.map(f => f.id === id ? { ...f, name: newName } : f));
    // Also update videos inside this folder
    const videosInFolder = videos.filter(v => v.collection_id === id);
    for (const v of videosInFolder) {
      if (window.api?.sync) {
        await window.api.sync.upsertRow('videos', { ...v, collection_name: newName, updated_at: new Date().toISOString() });
      }
    }
    await loadVideos();
  };

  const handleDeleteFolder = async (id: string) => {
    saveFolders(folders.filter(f => f.id !== id));
    // Move videos back to root
    const videosInFolder = videos.filter(v => v.collection_id === id);
    for (const v of videosInFolder) {
      if (window.api?.sync) {
        await window.api.sync.upsertRow('videos', { ...v, collection_id: undefined, collection_name: undefined, updated_at: new Date().toISOString() });
      }
    }
    await loadVideos();
  };

  const handleMoveVideo = async (video: VideoItem, folderId: string | null, folderName: string | null) => {
    if (window.api?.sync) {
      await window.api.sync.upsertRow('videos', {
        ...video,
        collection_id: folderId || undefined,
        collection_name: folderName || undefined,
        updated_at: new Date().toISOString()
      });
      await loadVideos();
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg text-dark-text relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-dark-card/30">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-500/10 rounded-xl text-brand-400">
            <PlaySquare size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Player Video</h1>
            <p className="text-sm text-dark-subtext">Seus vídeos e estudos interativos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-dark-card border border-white/10 rounded-lg p-1">
            <button
              onClick={() => { setViewMode('grid'); localStorage.setItem('videoViewMode', 'grid'); }}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
              title="Visualização em Grade"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => { setViewMode('list'); localStorage.setItem('videoViewMode', 'list'); }}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
              title="Visualização em Lista"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => { setViewMode('compact'); localStorage.setItem('videoViewMode', 'compact'); }}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'compact' ? 'bg-white/10 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
              title="Visualização Compacta"
            >
              <AlignJustify size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowYoutubeModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black/20 hover:bg-black/30 text-white text-sm font-medium rounded-lg transition-colors border border-white/10"
              title="Baixar do YouTube"
            >
              <MonitorPlay size={16} className="text-red-500" />
              <span className="hidden sm:inline">YouTube</span>
            </button>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-brand-500/20"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Importar</span>
            </button>
          </div>
        </div>
      </div>

      {playerError && (
        <div className="m-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
          {playerError}
        </div>
      )}

      {/* Grid / List */}
      <div className="flex-1 overflow-y-auto">
        <VideoGrid 
          videos={videos} 
          viewMode={viewMode} 
          onPlayVideo={handlePlayVideo}
          onDownloadVideo={handleDownload}
          onDeleteLocal={handleDeleteLocal}
          onDeleteCloud={handleDeleteCloud}
          onMoveVideo={handleMoveVideo}
          isDeletingId={isDeletingId}
          isDownloadingId={isDownloadingId}
          downloadProgress={downloadProgress}
          folders={folders}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
        />
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <VideoUploadModal 
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
        />
      )}
      
      {/* YouTube Modal */}
      {showYoutubeModal && (
        <YouTubeDownloadModal 
          onClose={() => setShowYoutubeModal(false)}
          onSuccess={loadVideos}
        />
      )}

      {/* Fullscreen Player */}
      {activeVideoSrc && activeVideo && (
        <div className="absolute inset-0 z-50 bg-black">
          <VideoPlayer 
            src={activeVideoSrc} 
            video={activeVideo}
            title={activeVideo.title}
            subtitleContent={activeSubtitle}
            onClose={() => {
              setActiveVideo(null);
              setActiveVideoSrc(null);
              loadVideos();
            }}
            onDurationLoaded={async (dur) => {
              if (!activeVideo.duration && window.api?.sync) {
                const updated = { ...activeVideo, duration: dur };
                await window.api.sync.upsertRow('videos', updated);
                setVideos(prev => prev.map(v => v.id === updated.id ? updated : v));
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

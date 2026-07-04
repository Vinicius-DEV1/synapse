import React, { useState, useEffect } from 'react';
import { VideoItem } from '../../types_video';
import VideoGrid from './VideoGrid';
import VideoPlayer from './VideoPlayer';
import VideoUploadModal from './VideoUploadModal';
import { resolveVideoUrl, uploadNewVideo, downloadVideoToLocal, getSubtitleText } from '../../services/video-manager';
import { PlaySquare, Plus } from 'lucide-react';

export default function VideoView() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
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
      
      // Load subtitles if exist
      const subText = await getSubtitleText(video.drive_subtitle_id, video.local_subtitle_path);
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

  const handleUpload = async (file: File, subtitleText: string | null) => {
    setIsUploading(true);
    try {
      await uploadNewVideo(file, subtitleText);
      await loadVideos();
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (video: VideoItem) => {
    try {
      await downloadVideoToLocal(video);
      await loadVideos();
    } catch (e) {
      console.error("Erro ao baixar:", e);
      alert("Erro ao baixar o vídeo para uso local.");
    }
  };

  const handleDeleteLocal = async (video: VideoItem) => {
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
    }
  };

  const handleDeleteCloud = async (video: VideoItem) => {
    // Delete from local first if it exists
    if (video.is_local) {
      await handleDeleteLocal(video);
    }
    // Delete from DB (The sync engine should handle the deletion from the actual Google Drive if implemented, 
    // but for now we just delete the metadata).
    if (window.api?.sync) {
      await window.api.sync.deleteRow('videos', video.id);
      await loadVideos();
    }
  };

  if (activeVideo && activeVideoSrc) {
    return (
      <div className="w-full h-full absolute inset-0 z-50 bg-black">
        <VideoPlayer 
          src={activeVideoSrc}
          title={activeVideo.title}
          subtitleContent={activeSubtitle}
          onClose={() => {
            setActiveVideo(null);
            setActiveVideoSrc(null);
          }}
        />
      </div>
    );
  }

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
        
        <button 
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-brand-500/20"
        >
          <Plus size={16} />
          <span>Importar Vídeo</span>
        </button>
      </div>

      {playerError && (
        <div className="m-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
          {playerError}
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <VideoGrid 
          videos={videos} 
          onPlayVideo={handlePlayVideo}
          onDownloadVideo={handleDownload}
          onDeleteLocal={handleDeleteLocal}
          onDeleteCloud={handleDeleteCloud}
        />
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <VideoUploadModal 
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
        />
      )}
    </div>
  );
}

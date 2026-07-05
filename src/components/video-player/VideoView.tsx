import React, { useState, useEffect } from 'react';
import type { VideoItem } from '../../types_video';
import VideoGrid from './VideoGrid';
import VideoPlayer from './VideoPlayer';
import VideoUploadModal, { type UploadOptions } from './VideoUploadModal';
import YouTubeDownloadModal from './YouTubeDownloadModal';
import { resolveVideoUrl, uploadNewVideo, downloadVideoToLocal, getSubtitleText } from '../../services/video-manager';
import { PlaySquare, Plus, LayoutGrid, List, AlignJustify, Youtube } from 'lucide-react';

export default function VideoView() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>('grid');
  
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

  const handleUpload = async (options: UploadOptions) => {
    setIsUploading(true);
    try {
      await uploadNewVideo(options);
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

  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const handleDeleteLocal = async (video: VideoItem) => {
    const confirm = window.api?.app?.showConfirm ? 
      await window.api.app.showConfirm(`Tem certeza que deseja excluir '${video.title}' localmente? Ele ainda estará no Drive.`) 
      : 1;
      
    if (confirm !== 1) return; // 1 é o botão "Sim", 0 é o Cancelar. Depende de como mapiei: 'Cancelar'(0), 'Sim, excluir'(1). 
    // Wait, in main.ts: buttons: ['Cancelar', 'Sim, excluir']. So 1 means 'Sim, excluir'.

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
      await window.api.app.showConfirm(`Tem certeza que deseja apagar permanentemente '${video.title}'? O arquivo local também será removido.`) 
      : 1;

    if (confirm !== 1) return;

    setIsDeletingId(video.id);
    try {
      if (video.is_local) {
        await window.api?.video?.deleteLocal(video.original_name);
      }
      if (window.api?.sync) {
        await window.api.sync.deleteRow('videos', video.id);
        await loadVideos();
      }
    } catch(e) {
      console.error("Erro ao excluir da nuvem", e);
    } finally {
      setIsDeletingId(null);
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
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
              title="Visualização em Grade"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
              title="Visualização em Lista"
            >
              <List size={18} />
            </button>
            <button
              onClick={() => setViewMode('compact')}
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
              <Youtube size={16} className="text-red-500" />
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
          isDeletingId={isDeletingId}
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

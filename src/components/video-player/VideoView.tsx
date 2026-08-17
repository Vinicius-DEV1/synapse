import { useState, useEffect } from 'react';
import type { VideoItem } from '../../types';
import VideoGrid from './VideoGrid';
import VideoPlayer from './VideoPlayer';
import type { UploadOptions } from './VideoUploadModal';
import { resolveVideoUrl, uploadNewVideo, downloadVideoToLocal, deleteVideoAndSync, generateWebVersionTask } from '../../services/video-manager';
import { useStore } from '../../store/useStore';
import { useTasks } from '../../store/TaskContext';
import { useVideoFolders } from './hooks/useVideoFolders';
import { VideoViewHeader } from './ui/VideoViewHeader';
import { VideoViewModals } from './ui/VideoViewModals';

export default function VideoView({ tabId }: { tabId?: string }) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'compact'>(() => {
    return (localStorage.getItem('videoViewMode') as any) || 'grid';
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  
  // Player state
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [activeVideoSrc, setActiveVideoSrc] = useState<string | null>(null);
  const [activeSubtitle, setActiveSubtitle] = useState<string | undefined>();
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [webVersionVideo, setWebVersionVideo] = useState<VideoItem | null>(null);
  
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);

  const { addTask, updateTaskProgress, completeTask, failTask } = useTasks();
  
  const { state } = useStore();
  const activeTab = state.tabs.find(t => t.id === tabId) || state.tabs[0];
  const pendingVideoId = activeTab?.moduleState?.videoId;

  const loadVideos = async () => {
    try {
      if (window.api?.sync) {
        const rows = await window.api.sync.getTable('videos');
        setVideos((rows as VideoItem[]).filter((v: any) => !v.deleted_at));
      }
    } catch (e) {
      console.error('Failed to load videos:', e);
    }
  };

  const {
    folders,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleMoveVideo
  } = useVideoFolders(videos, loadVideos);

  useEffect(() => {
    loadVideos();
    
    let unsubscribe = () => {};
    if (window.api?.onSyncTrigger) {
      unsubscribe = window.api.onSyncTrigger(() => loadVideos());
    }
    return () => unsubscribe();
  }, []);

  const handlePlayVideo = async (video: VideoItem) => {
    try {
      setPlayerError(null);
      setActiveSubtitle(undefined);
      const src = await resolveVideoUrl(video);
      setActiveVideoSrc(src);
      setActiveVideo(video);
    } catch (e: any) {
      console.error(e);
      setPlayerError(e.message || 'Erro ao carregar o vídeo.');
    }
  };

  useEffect(() => {
    if (pendingVideoId && videos.length > 0) {
      if (activeVideo?.id !== pendingVideoId) {
        const vid = videos.find(v => v.id === pendingVideoId);
        if (vid) {
          handlePlayVideo(vid);
        }
      }
    }
  }, [pendingVideoId, videos, activeVideo?.id]);

  const handleUpload = async (options: UploadOptions) => {
    const taskId = `upload_${Date.now()}`;
    const abortController = new AbortController();
    
    addTask(taskId, `Importando: ${options.videoFile.name}`, abortController);

    uploadNewVideo({
      ...options,
      onProgress: (pct) => updateTaskProgress(taskId, pct),
      onPhaseChange: (phase) => updateTaskProgress(taskId, 0, `[Upload] ${phase}`),
      signal: abortController.signal
    }).then(() => {
      completeTask(taskId);
      loadVideos();
    }).catch((e: any) => {
      if (e.message !== 'Cancelado pelo usuário') {
        failTask(taskId, e.message || 'Erro desconhecido');
      }
    });
  };

  const handleDownload = async (video: VideoItem) => {
    let forceOriginal = false;
    const ext = video.original_name.split('.').pop()?.toLowerCase() || '';
    const isUnsupported = !['mp4', 'webm'].includes(ext);
    
    if (isUnsupported && video.drive_web_file_id) {
      const confirm = window.api?.app?.showConfirm ? 
        await window.api.app.showConfirm(`Este vídeo (${video.original_name}) possui um formato que não roda nativamente na web.\n\nPor padrão, o Caderno baixará a "Versão Web" convertida (muito mais leve).\n\nDeseja forçar o download do ARQUIVO ORIGINAL pesado em vez da versão web?`) 
        : 0;
      if (confirm === 1) forceOriginal = true;
    }

    setIsDownloadingId(video.id);
    setDownloadProgress(0);
    try {
      await downloadVideoToLocal(video, (percent) => {
        setDownloadProgress(Math.round(percent));
      }, forceOriginal);
      await loadVideos();
    } catch (e) {
      console.error("Erro ao baixar:", e);
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

  const handleStartWebVersion = async (quality: string) => {
    if (!webVersionVideo) return;
    const video = webVersionVideo;
    const taskId = `web_gen_${video.id}_${Date.now()}`;
    const abortController = new AbortController();
    
    addTask(taskId, `Conversão Web: ${video.title}`, abortController);
    
    try {
      await generateWebVersionTask(
        video,
        quality,
        'medium',
        (pct) => updateTaskProgress(taskId, pct),
        (phase) => updateTaskProgress(taskId, 0, `[Conversão Web] ${phase}`),
        abortController.signal
      );
      completeTask(taskId);
      loadVideos();
    } catch (e: any) {
      const errMsg = typeof e === 'string' ? e : e.message;
      if (errMsg !== 'Cancelado pelo usuário') {
        failTask(taskId, errMsg || 'Erro desconhecido');
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg text-dark-text relative">
      <VideoViewHeader
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          localStorage.setItem('videoViewMode', mode);
        }}
        onOpenYoutubeModal={() => setShowYoutubeModal(true)}
        onOpenUploadModal={() => setShowUploadModal(true)}
      />

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
          onActiveCollectionChange={(id, name) => {
            setSelectedFolderId(id);
            setSelectedFolderName(name);
          }}
          onGenerateWebVersion={(v) => setWebVersionVideo(v)}
        />
      </div>

      <VideoViewModals
        showUploadModal={showUploadModal}
        onCloseUploadModal={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        selectedFolderId={selectedFolderId}
        selectedFolderName={selectedFolderName}
        showYoutubeModal={showYoutubeModal}
        onCloseYoutubeModal={() => setShowYoutubeModal(false)}
        onYoutubeSuccess={loadVideos}
        webVersionVideo={webVersionVideo}
        onCloseWebVersionModal={() => setWebVersionVideo(null)}
        onConfirmWebVersion={handleStartWebVersion}
      />

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

import { useState, useEffect, useRef } from 'react';
import type { VideoItem, TrackItem } from '../../../types';
import { formatBytes, formatHumanDuration } from '../../../utils/format';
import { attachSubtitleToVideo, removeSubtitleFromVideo, renameSubtitleInVideo } from '../../../services/video';
import { getCultureKey } from '../../../store/useStore';
import { triggerToast } from '../../ui/ToastContext';

export type TabType = 'overview' | 'tracks' | 'storage';

export interface StorageStats {
  original_path: string | null;
  original_size: number | null;
  web_path: string | null;
  web_size: number | null;
  audio_sizes: Record<string, number>;
  subtitle_sizes: Record<string, number>;
  total_local_size: number;
}

interface UseVideoInfoModalProps {
  video: VideoItem & { local_subtitle_path?: string };
  onVideoUpdated?: (updatedVideo: VideoItem) => void;
}

export function useVideoInfoModal({ video, onVideoUpdated }: UseVideoInfoModalProps) {
  const [currentVideo, setCurrentVideo] = useState(video);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const [isProcessingSub, setIsProcessingSub] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState('');
  const subFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentVideo(video);
  }, [video]);

  // Load exact file storage stats from native backend
  useEffect(() => {
    let mounted = true;

    const loadStats = async () => {
      if (!window.api?.video?.getStorageStats) return;

      let audios: string[] = [];
      let subs: string[] = [];
      try {
        if (currentVideo.audio_tracks_json) {
          const parsed: TrackItem[] = JSON.parse(currentVideo.audio_tracks_json);
          audios = parsed.map(a => a.local_path?.split(/[\\/]/).pop() || '').filter(Boolean);
        }
        if (currentVideo.subtitles_json) {
          const parsed: TrackItem[] = JSON.parse(currentVideo.subtitles_json);
          subs = parsed.map(s => s.local_path?.split(/[\\/]/).pop() || '').filter(Boolean);
        }
      } catch (e) {
        console.warn('Failed to parse tracks for storage stats:', e);
      }

      setIsLoadingStats(true);
      try {
        const res = await window.api.video.getStorageStats(
          currentVideo.original_name || currentVideo.file_path || '',
          audios,
          subs
        );
        if (mounted && res) {
          setStats(res);
        }
      } catch (err) {
        console.warn('Failed to load storage statistics:', err);
      } finally {
        if (mounted) setIsLoadingStats(false);
      }
    };

    loadStats();
    return () => { mounted = false; };
  }, [currentVideo]);

  const formatDuration = (seconds?: number) =>
    formatHumanDuration(seconds, { includeSeconds: true, fallback: '--:--' });

  const getExtension = (filename?: string) => {
    if (!filename) return 'MP4';
    return filename.split('.').pop()?.toUpperCase() || 'MP4';
  };

  const copyToClipboard = (text: string, field: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      triggerToast('Copiado para a área de transferência', 'info');
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const handleOpenInFolder = async (pathOrName?: string) => {
    const target = pathOrName || stats?.original_path || currentVideo.file_path || currentVideo.original_name;
    if (!target) {
      triggerToast('Caminho não disponível.', 'warning');
      return;
    }

    try {
      if (window.api?.video?.showInFolder) {
        await window.api.video.showInFolder(target);
        triggerToast('Pasta aberta no gerenciador de arquivos.', 'success');
      } else {
        triggerToast('Recurso disponível apenas no aplicativo Desktop.', 'info');
      }
    } catch (err: unknown) {
      console.error('Error opening folder:', err);
      triggerToast('Não foi possível abrir o local do arquivo.', 'error');
    }
  };

  const handleAddSubtitle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingSub(true);
      const { updatedVideo, newTrack } = await attachSubtitleToVideo(currentVideo, file, undefined, getCultureKey());
      setCurrentVideo(updatedVideo);
      if (onVideoUpdated) onVideoUpdated(updatedVideo);
      triggerToast(`Legenda "${newTrack.label}" anexada com sucesso!`, 'success');
    } catch (err: unknown) {
      console.error('Error attaching subtitle:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao anexar legenda.';
      triggerToast(msg, 'error');
    } finally {
      setIsProcessingSub(false);
      if (subFileInputRef.current) subFileInputRef.current.value = '';
    }
  };

  const handleRemoveSubtitle = async (trackId: string, label: string) => {
    if (!window.confirm(`Deseja realmente remover a legenda "${label}"?`)) return;

    try {
      setIsProcessingSub(true);
      const updatedVideo = await removeSubtitleFromVideo(currentVideo, trackId);
      setCurrentVideo(updatedVideo);
      if (onVideoUpdated) onVideoUpdated(updatedVideo);
      triggerToast(`Legenda "${label}" removida.`, 'info');
    } catch (err: unknown) {
      console.error('Error removing subtitle:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao remover legenda.';
      triggerToast(msg, 'error');
    } finally {
      setIsProcessingSub(false);
    }
  };

  const handleSaveRename = async (trackId: string) => {
    if (!editLabelValue.trim()) {
      setEditingTrackId(null);
      return;
    }

    try {
      setIsProcessingSub(true);
      const updatedVideo = await renameSubtitleInVideo(currentVideo, trackId, editLabelValue.trim());
      setCurrentVideo(updatedVideo);
      if (onVideoUpdated) onVideoUpdated(updatedVideo);
      triggerToast('Nome da legenda atualizado!', 'success');
    } catch (err: unknown) {
      console.error('Error renaming subtitle:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao renomear legenda.';
      triggerToast(msg, 'error');
    } finally {
      setIsProcessingSub(false);
      setEditingTrackId(null);
      setEditLabelValue('');
    }
  };

  let audioTracks: TrackItem[] = [];
  let subtitleTracks: TrackItem[] = [];
  try {
    if (currentVideo.audio_tracks_json) audioTracks = JSON.parse(currentVideo.audio_tracks_json);
    if (currentVideo.subtitles_json) subtitleTracks = JSON.parse(currentVideo.subtitles_json);
  } catch (e) {
    console.warn('Failed to parse audio/subtitle tracks JSON:', e);
  }

  const progressPercent = currentVideo.duration && currentVideo.progress 
    ? Math.min(100, Math.round((currentVideo.progress / currentVideo.duration) * 100))
    : 0;

  const totalSizeFormatted = stats?.total_local_size && stats.total_local_size > 0 
    ? formatBytes(stats.total_local_size) 
    : currentVideo.is_local ? 'Calculando...' : 'Nuvem';

  const origSizeFormatted = stats?.original_size 
    ? formatBytes(stats.original_size) 
    : currentVideo.is_local ? 'Em disco' : 'Remoto';

  const webSizeFormatted = stats?.web_size 
    ? formatBytes(stats.web_size) 
    : 'Remoto (Drive)';

  return {
    currentVideo,
    activeTab,
    setActiveTab,
    copiedField,
    stats,
    isLoadingStats,
    isProcessingSub,
    editingTrackId,
    setEditingTrackId,
    editLabelValue,
    setEditLabelValue,
    subFileInputRef,
    formatDuration,
    getExtension,
    copyToClipboard,
    handleOpenInFolder,
    handleAddSubtitle,
    handleRemoveSubtitle,
    handleSaveRename,
    audioTracks,
    subtitleTracks,
    progressPercent,
    totalSizeFormatted,
    origSizeFormatted,
    webSizeFormatted
  };
}

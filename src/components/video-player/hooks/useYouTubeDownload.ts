import { useState, useEffect } from 'react';
import { useTasks } from '../../../store/TaskContext';
import { downloadYouTubeAndSync } from '../../../services/video';
import { triggerToast } from '../../ui/ToastContext';
import { getValidAccessToken } from '../../../services/drive';
import type { SubtitleOption } from '../ui/YouTubeSubtitleSelector';

interface UseYouTubeDownloadProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function useYouTubeDownload({ onClose, onSuccess }: UseYouTubeDownloadProps) {
  const [url, setUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [driveStatus, setDriveStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  const [selectedQuality, setSelectedQuality] = useState('best');
  const [filename, setFilename] = useState('');
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [collectionName, setCollectionName] = useState('');

  const [availableSubs, setAvailableSubs] = useState<SubtitleOption[]>([]);
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [subSearch, setSubSearch] = useState('');

  const { addTask, updateTaskProgress, completeTask, failTask } = useTasks();

  useEffect(() => {
    let mounted = true;
    getValidAccessToken()
      .then(t => {
        if (mounted) setDriveStatus(t ? 'connected' : 'disconnected');
      })
      .catch(() => {
        if (mounted) setDriveStatus('disconnected');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleFetchInfo = async () => {
    if (!url) return;
    setIsFetching(true);
    setError(null);
    try {
      const info = await window.api?.youtube?.fetchInfo(url);
      if (!info) throw new Error('Não foi possível obter dados do vídeo.');
      
      setVideoInfo(info);
      
      const subs: SubtitleOption[] = [];
      if (info.subtitles) {
        Object.keys(info.subtitles).forEach(lang => {
          subs.push({ lang, name: info.subtitles[lang][0]?.name || lang, isAuto: false });
        });
      }
      if (info.automatic_captions) {
        Object.keys(info.automatic_captions).forEach(lang => {
          if (!subs.find(s => s.lang === lang)) {
            subs.push({ lang, name: info.automatic_captions[lang][0]?.name || lang, isAuto: true });
          }
        });
      }
      subs.sort((a, b) => {
        if (a.isAuto === b.isAuto) return a.lang.localeCompare(b.lang);
        return a.isAuto ? 1 : -1;
      });

      setAvailableSubs(subs);
      setSelectedSubs([]);
      setSubSearch('');

      if (info._type === 'playlist' || info.entries) {
        setIsPlaylist(true);
        setCollectionName(info.title || 'Nova Playlist');
      } else {
        setIsPlaylist(false);
        setFilename(info.title ? `${info.title}.mp4` : 'video.mp4');
      }
    } catch (err: any) {
      const msg = err.message || 'Falha ao analisar a URL do YouTube.';
      setError(msg);
      triggerToast(msg, 'error');
    } finally {
      setIsFetching(false);
    }
  };

  const handleToggleSub = (lang: string) => {
    setSelectedSubs(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const handleDownload = async () => {
    if (!videoInfo) return;
    setIsDownloading(true);
    setError(null);
    
    const displayTitle = videoInfo?.title || filename || 'Vídeo';
    const taskId = `youtube_dl_${Date.now()}`;
    const abortController = new AbortController();
    
    addTask(taskId, `Download YouTube: ${displayTitle}`, abortController);
    triggerToast(`Download iniciado em segundo plano: ${displayTitle}`, 'info');
    
    onClose();

    const doDownload = async () => {
      try {
        if (isPlaylist && videoInfo.entries) {
          const collectionId = crypto.randomUUID();
          const total = videoInfo.entries.length;
          let completed = 0;

          for (const entry of videoInfo.entries) {
            const entryTitle = entry.title || `Video_${completed + 1}`;
            
            await downloadYouTubeAndSync({
              url: entry.webpage_url || entry.url || url,
              quality: selectedQuality,
              filename: `${entryTitle.replace(/[\\/:*?"<>|]/g, '')}.mp4`,
              youtubeInfo: entry,
              collectionId,
              collectionName: collectionName,
              selectedSubs,
              onProgress: (p) => {
                const basePercent = (completed / total) * 100;
                const itemPercent = (p / 100) * (100 / total);
                updateTaskProgress(taskId, basePercent + itemPercent, `[${completed + 1}/${total}] ${entryTitle}`);
              },
            });
            completed++;
          }
        } else {
          await downloadYouTubeAndSync({
            url: url,
            quality: selectedQuality,
            filename: filename.replace(/[\\/:*?"<>|]/g, ''),
            youtubeInfo: videoInfo,
            selectedSubs,
            onProgress: (p) => updateTaskProgress(taskId, p),
          });
        }
        completeTask(taskId);
        triggerToast(`Download do YouTube concluído: ${displayTitle}`, 'success');
        onSuccess();
      } catch (err: any) {
        const errMsg = err.message || 'Falha durante o download do YouTube.';
        failTask(taskId, errMsg);
        triggerToast(`Erro no download do YouTube: ${errMsg}`, 'error', 6000);
      }
    };
    
    doDownload();
  };

  return {
    url,
    setUrl,
    isFetching,
    videoInfo,
    isDownloading,
    progress,
    error,
    driveStatus,
    selectedQuality,
    setSelectedQuality,
    filename,
    setFilename,
    isPlaylist,
    collectionName,
    setCollectionName,
    availableSubs,
    selectedSubs,
    subSearch,
    setSubSearch,
    handleFetchInfo,
    handleToggleSub,
    handleDownload,
  };
}

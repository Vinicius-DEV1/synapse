import React, { useState } from 'react';
import { X, Loader2, Download, Video, FolderPlus, MonitorPlay, MessageSquare } from 'lucide-react';
import { useTasks } from '../../store/TaskContext';
import { downloadYouTubeAndSync } from '../../services/video-manager';
import { Portal } from '../ui/Portal';

interface YouTubeDownloadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface SubtitleOption {
  lang: string;
  name: string;
  isAuto: boolean;
}

export default function YouTubeDownloadModal({ onClose, onSuccess }: YouTubeDownloadModalProps) {
  const [url, setUrl] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const { addTask, updateTaskProgress, completeTask, failTask } = useTasks();

  const [selectedQuality, setSelectedQuality] = useState('best');
  const [filename, setFilename] = useState('');
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [collectionName, setCollectionName] = useState('');

  const [availableSubs, setAvailableSubs] = useState<SubtitleOption[]>([]);
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [subSearch, setSubSearch] = useState('');

  const handleFetchInfo = async () => {
    if (!url) return;
    setIsFetching(true);
    setError(null);
    try {
      const info = await window.api?.youtube?.fetchInfo(url);
      if (!info) throw new Error("Não foi possível obter dados.");
      
      setVideoInfo(info);
      
      // Parse subtitles
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
      // Sort: manual first, then alphabetical
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
      setError(err.message || 'Falha ao analisar a URL.');
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
    
    const taskId = `youtube_dl_${Date.now()}`;
    const abortController = new AbortController();
    
    addTask(taskId, `Download YouTube: ${videoInfo?.title || filename}`, abortController);
    
    onClose();

    const doDownload = async () => {
      try {
        if (isPlaylist && videoInfo.entries) {
          const collectionId = crypto.randomUUID();
          const total = videoInfo.entries.length;
          let completed = 0;

          for (const entry of videoInfo.entries) {
            const entryTitle = entry.title || `Video_${completed+1}`;
            
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
              }
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
            onProgress: (p) => updateTaskProgress(taskId, p)
          });
        }
        completeTask(taskId);
        onSuccess();
      } catch (err: any) {
        failTask(taskId, err.message || 'Falha durante o download.');
      }
    };
    
    doDownload();
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-dark-card border border-white/10 rounded-2xl w-[560px] max-w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-white font-medium flex items-center gap-2">
            <MonitorPlay size={18} className="text-red-500" />
            Baixar do YouTube
          </h2>
          <button onClick={onClose} className="text-dark-subtext hover:text-white transition-colors" disabled={isDownloading}>
            <X size={20} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-6 overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded-xl border border-red-500/20">
              {error}
            </div>
          )}

          {!videoInfo && (
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-white/80">URL do Vídeo ou Playlist</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchInfo()}
                />
                <button 
                  onClick={handleFetchInfo}
                  disabled={!url || isFetching}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                >
                  {isFetching ? <Loader2 size={16} className="animate-spin" /> : 'Analisar'}
                </button>
              </div>
            </div>
          )}

          {videoInfo && !isDownloading && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Info Header */}
              <div className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                {videoInfo.thumbnail ? (
                  <img src={videoInfo.thumbnail} alt="Thumbnail" className="w-32 aspect-video object-cover rounded-lg bg-black/50 shadow-md" />
                ) : (
                  <div className="w-32 aspect-video rounded-lg bg-black/50 flex items-center justify-center text-white/20">
                    <Video size={24} />
                  </div>
                )}
                <div className="flex-1 overflow-hidden">
                  <h3 className="text-white font-medium text-sm line-clamp-2" title={videoInfo.title}>
                    {videoInfo.title}
                  </h3>
                  <p className="text-xs text-dark-subtext mt-1">
                    {isPlaylist ? `${videoInfo.entries?.length || 0} vídeos na playlist` : videoInfo.uploader || 'YouTube'}
                  </p>
                </div>
              </div>

              {/* Form Settings */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-white/70">Qualidade do Vídeo</label>
                  <select 
                    value={selectedQuality}
                    onChange={(e) => setSelectedQuality(e.target.value)}
                    className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                  >
                    <option className="bg-dark-bg text-white" value="best">Melhor (Recomendado)</option>
                    <option className="bg-dark-bg text-white" value="bestvideo[height<=1080]+bestaudio/best[height<=1080]">1080p ou menor</option>
                    <option className="bg-dark-bg text-white" value="bestvideo[height<=720]+bestaudio/best[height<=720]">720p ou menor</option>
                    <option className="bg-dark-bg text-white" value="bestaudio/best">Apenas Áudio (Menor tamanho)</option>
                  </select>
                </div>

                {availableSubs.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-medium text-white/70 flex items-center gap-2">
                        <MessageSquare size={14} className="text-brand-400" />
                        Legendas para Embutir
                      </label>
                      <input 
                        type="text"
                        placeholder="Buscar idioma..."
                        value={subSearch}
                        onChange={(e) => setSubSearch(e.target.value)}
                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-500 w-32"
                      />
                    </div>
                    <div className="max-h-[120px] overflow-y-auto bg-black/20 border border-white/10 rounded-lg p-2 flex flex-col gap-1">
                      {availableSubs
                        .filter(sub => 
                          sub.lang.toLowerCase().includes(subSearch.toLowerCase()) || 
                          sub.name.toLowerCase().includes(subSearch.toLowerCase())
                        )
                        .map(sub => (
                        <label key={sub.lang} className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-md cursor-pointer transition-colors group">
                          <input 
                            type="checkbox"
                            checked={selectedSubs.includes(sub.lang)}
                            onChange={() => handleToggleSub(sub.lang)}
                            className="w-3.5 h-3.5 accent-brand-500 bg-black/30 border-white/20 rounded-sm cursor-pointer"
                          />
                          <span className="text-sm text-white group-hover:text-brand-300 transition-colors flex-1 flex items-center justify-between">
                            {sub.name.toUpperCase()} ({sub.lang})
                            {sub.isAuto && (
                              <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded uppercase font-medium ml-2">Auto</span>
                            )}
                          </span>
                        </label>
                      ))}
                      {availableSubs.filter(sub => sub.lang.toLowerCase().includes(subSearch.toLowerCase()) || sub.name.toLowerCase().includes(subSearch.toLowerCase())).length === 0 && (
                        <span className="text-xs text-dark-subtext p-2 text-center">Nenhuma legenda encontrada.</span>
                      )}
                    </div>
                  </div>
                )}

                {isPlaylist ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-white/70 flex items-center gap-2">
                      <FolderPlus size={14} className="text-brand-400" />
                      Nome da Pasta/Coleção
                    </label>
                    <input 
                      type="text" 
                      value={collectionName}
                      onChange={(e) => setCollectionName(e.target.value)}
                      className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-white/70">Nome do Arquivo (Local)</label>
                    <input 
                      type="text" 
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {isDownloading && (
            <div className="flex flex-col gap-3 py-4 animate-scale-in">
              <div className="flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white">Baixando e Sincronizando...</span>
                  <span className="text-xs text-dark-subtext">Isso pode levar alguns minutos.</span>
                </div>
                <span className="text-brand-400 font-mono text-sm">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/10 p-0.5">
                <div 
                  className="bg-gradient-to-r from-red-500 to-brand-500 h-full rounded-full transition-all duration-300 ease-out shadow-lg shadow-brand-500/20"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-2 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isDownloading}
              className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            {videoInfo && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading || (!isPlaylist && !filename)}
                className="flex items-center gap-2 px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
              >
                {isDownloading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Baixando...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Iniciar Download
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}

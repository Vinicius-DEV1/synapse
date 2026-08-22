import { X, Loader2, Download, Video, FolderPlus, MonitorPlay, CloudOff, Cloud } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { YouTubeSubtitleSelector } from './ui/YouTubeSubtitleSelector';

import { useYouTubeDownload } from './hooks/useYouTubeDownload';

interface YouTubeDownloadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function YouTubeDownloadModal({ onClose, onSuccess }: YouTubeDownloadModalProps) {
  const {
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
  } = useYouTubeDownload({ onClose, onSuccess });

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-dark-card border border-white/10 rounded-2xl w-[560px] max-w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-medium flex items-center gap-2">
                <MonitorPlay size={18} className="text-red-500" />
                Baixar do YouTube
              </h2>
              {driveStatus === 'connected' ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Cloud size={12} />
                  Drive
                </span>
              ) : driveStatus === 'disconnected' ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <CloudOff size={12} />
                  Offline
                </span>
              ) : null}
            </div>
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

                  <YouTubeSubtitleSelector
                    availableSubs={availableSubs}
                    selectedSubs={selectedSubs}
                    subSearch={subSearch}
                    setSubSearch={setSubSearch}
                    onToggleSub={handleToggleSub}
                  />

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

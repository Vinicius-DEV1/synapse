import { X, HardDrive, FileVideo, Clock, Play } from 'lucide-react';
import type { VideoItem } from '../../types';
import { Portal } from '../ui/Portal';
import { useVideoInfoModal } from './modals/useVideoInfoModal';
import { VideoInfoOverviewTab } from './modals/VideoInfoOverviewTab';
import { VideoInfoTracksTab } from './modals/VideoInfoTracksTab';
import { VideoInfoStorageTab } from './modals/VideoInfoStorageTab';

interface VideoInfoModalProps {
  // `local_subtitle_path` extended optional field on VideoItem,
  // used for standalone subtitles downloaded from YouTube.
  video: VideoItem & { local_subtitle_path?: string };
  onClose: () => void;
  onVideoUpdated?: (updatedVideo: VideoItem) => void;
  onPlayVideo?: (video: VideoItem) => void;
}

export default function VideoInfoModal({ video, onClose, onVideoUpdated, onPlayVideo }: VideoInfoModalProps) {
  const {
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
  } = useVideoInfoModal({ video, onVideoUpdated });

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in">
        <div className="bg-dark-card border border-white/10 rounded-2xl w-[660px] max-w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
          
          {/* Compact Integrated Header Bar */}
          <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="p-2.5 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-400 shrink-0">
                  <FileVideo size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded">
                      {getExtension(currentVideo.file_path || currentVideo.original_name)}
                    </span>
                    {currentVideo.collection_name && (
                      <span className="px-2 py-0.5 text-[11px] font-medium bg-white/5 text-white/70 border border-white/10 rounded truncate max-w-[160px]">
                        📁 {currentVideo.collection_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] text-white/50 font-mono">
                      <Clock size={11} className="text-brand-400" />
                      {formatDuration(currentVideo.duration)}
                    </span>
                  </div>
                  <h2 className="text-white font-bold text-base sm:text-lg leading-tight mt-1 truncate" title={currentVideo.title}>
                    {currentVideo.title}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {currentVideo.is_local && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <HardDrive size={13} />
                    {totalSizeFormatted}
                  </span>
                )}
                <button 
                  onClick={onClose} 
                  className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Fechar (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Watch Progress Sub-Bar if started */}
            {progressPercent > 0 && (
              <div className="w-full bg-black/40 h-1 rounded-full overflow-hidden border border-white/5 mt-3">
                <div 
                  className="bg-gradient-to-r from-brand-500 to-indigo-400 h-full rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>

          {/* Clean Segmented Navigation Tabs */}
          <div className="flex px-6 border-b border-white/10 gap-6 text-sm font-medium bg-white/[0.01]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 relative transition-colors ${activeTab === 'overview' ? 'text-brand-400 font-semibold' : 'text-white/60 hover:text-white'}`}
            >
              Visão Geral
              {activeTab === 'overview' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('tracks')}
              className={`py-3 relative transition-colors flex items-center gap-1.5 ${activeTab === 'tracks' ? 'text-brand-400 font-semibold' : 'text-white/60 hover:text-white'}`}
            >
              Áudios & Legendas
              <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-white/80 font-mono">
                {audioTracks.length + subtitleTracks.length}
              </span>
              {activeTab === 'tracks' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('storage')}
              className={`py-3 relative transition-colors ${activeTab === 'storage' ? 'text-brand-400 font-semibold' : 'text-white/60 hover:text-white'}`}
            >
              Caminhos & Nuvem
              {activeTab === 'storage' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-400 rounded-full" />
              )}
            </button>
          </div>

          {/* Modal Tab Content Area */}
          <div className="p-6 overflow-y-auto flex flex-col gap-4 max-h-[58vh] custom-scrollbar">
            {activeTab === 'overview' && (
              <VideoInfoOverviewTab
                currentVideo={currentVideo}
                stats={stats}
                isLoadingStats={isLoadingStats}
                origSizeFormatted={origSizeFormatted}
                webSizeFormatted={webSizeFormatted}
                progressPercent={progressPercent}
                formatDuration={formatDuration}
                getExtension={getExtension}
                handleOpenInFolder={handleOpenInFolder}
              />
            )}

            {activeTab === 'tracks' && (
              <VideoInfoTracksTab
                currentVideo={currentVideo}
                audioTracks={audioTracks}
                subtitleTracks={subtitleTracks}
                stats={stats}
                isProcessingSub={isProcessingSub}
                editingTrackId={editingTrackId}
                setEditingTrackId={setEditingTrackId}
                editLabelValue={editLabelValue}
                setEditLabelValue={setEditLabelValue}
                subFileInputRef={subFileInputRef}
                handleAddSubtitle={handleAddSubtitle}
                handleRemoveSubtitle={handleRemoveSubtitle}
                handleSaveRename={handleSaveRename}
              />
            )}

            {activeTab === 'storage' && (
              <VideoInfoStorageTab
                currentVideo={currentVideo}
                stats={stats}
                copiedField={copiedField}
                copyToClipboard={copyToClipboard}
                handleOpenInFolder={handleOpenInFolder}
              />
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
            <span className="text-xs text-white/40">Caderno Vídeos</span>
            <div className="flex items-center gap-2.5">
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-sm font-medium rounded-xl transition-colors border border-white/10"
              >
                Fechar
              </button>
              {onPlayVideo && (
                <button 
                  onClick={() => {
                    onClose();
                    onPlayVideo(currentVideo);
                  }}
                  className="flex items-center gap-2 px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/20 active:scale-95"
                >
                  <Play size={15} className="fill-current" />
                  Assistir
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

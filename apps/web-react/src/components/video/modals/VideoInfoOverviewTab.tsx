import { Sparkles, Layers, Loader2, FolderOpen, ShieldCheck, Cloud } from 'lucide-react';
import type { VideoItem } from '../../../types';
import type { StorageStats } from './useVideoInfoModal';

interface VideoInfoOverviewTabProps {
  currentVideo: VideoItem;
  stats: StorageStats | null;
  isLoadingStats: boolean;
  origSizeFormatted: string;
  webSizeFormatted: string;
  progressPercent: number;
  formatDuration: (seconds?: number) => string;
  getExtension: (filename?: string) => string;
  handleOpenInFolder: (pathOrName?: string) => Promise<void>;
}

export function VideoInfoOverviewTab({
  currentVideo,
  stats,
  isLoadingStats,
  origSizeFormatted,
  webSizeFormatted,
  progressPercent,
  formatDuration,
  getExtension,
  handleOpenInFolder
}: VideoInfoOverviewTabProps) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Description */}
      {currentVideo.youtube_description && (
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
          <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles size={13} className="text-brand-400" />
            Descrição
          </h4>
          <p className="text-xs sm:text-sm text-white/80 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar leading-relaxed">
            {currentVideo.youtube_description}
          </p>
        </div>
      )}

      {/* Video Versions & File Sizes List */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <Layers size={14} className="text-brand-400" />
            Versões & Tamanhos de Arquivo
          </h4>
          {isLoadingStats && <Loader2 size={13} className="animate-spin text-brand-400" />}
        </div>

        <ul className="space-y-2.5">
          {/* Original / Local Version */}
          {currentVideo.is_local && (
            <li className="text-xs sm:text-sm text-white/90 bg-black/30 px-3.5 py-2.5 rounded-xl flex items-center justify-between border border-white/5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">Versão Local Original</span>
                <span className="text-[10px] bg-brand-500/20 text-brand-300 font-mono px-2 py-0.5 rounded border border-brand-500/30">
                  {getExtension(currentVideo.file_path || currentVideo.original_name)}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-white/70 font-mono font-medium">{origSizeFormatted}</span>
                <button
                  type="button"
                  onClick={() => handleOpenInFolder(stats?.original_path || currentVideo.file_path)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors"
                  title="Abrir no gerenciador de arquivos"
                >
                  <FolderOpen size={14} />
                </button>
              </div>
            </li>
          )}

          {/* Original Cloud Backup */}
          {currentVideo.drive_file_id && (
            <li className="text-xs sm:text-sm text-white/90 bg-black/30 px-3.5 py-2.5 rounded-xl flex items-center justify-between border border-white/5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">Backup Original na Nuvem</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono px-2 py-0.5 rounded border border-sky-500/30">
                  {getExtension(currentVideo.original_name)}
                </span>
              </div>
              <span className="text-xs text-sky-400/90 flex items-center gap-1 font-medium shrink-0">
                <ShieldCheck size={13} /> Sincronizado
              </span>
            </li>
          )}

          {/* Web Remux Version */}
          {currentVideo.drive_web_file_id && (
            <li className="text-xs sm:text-sm text-white/90 bg-black/30 px-3.5 py-2.5 rounded-xl flex items-center justify-between border border-white/5 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">Web Remux (Streaming)</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-mono px-2 py-0.5 rounded border border-purple-500/30">
                  MP4
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {stats?.web_size && (
                  <span className="text-xs text-white/70 font-mono">{webSizeFormatted}</span>
                )}
                <span className="text-xs text-purple-400/90 flex items-center gap-1 font-medium">
                  <Cloud size={13} /> Nuvem
                </span>
              </div>
            </li>
          )}

          {!currentVideo.is_local && !currentVideo.drive_file_id && !currentVideo.drive_web_file_id && !currentVideo.youtube_url && (
            <li className="text-xs text-white/40 italic py-2">Nenhuma versão encontrada no armazenamento.</li>
          )}
        </ul>
      </div>

      {/* Progress & Watch Info Card */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-white/50 uppercase font-semibold">Progresso de Estudo</span>
          <span className="text-sm text-white font-medium">
            {formatDuration(currentVideo.progress)} de {formatDuration(currentVideo.duration)} ({progressPercent}%)
          </span>
        </div>
        {currentVideo.last_watched_at && (
          <div className="sm:text-right">
            <span className="text-[11px] text-white/40 block">Visto pela última vez</span>
            <span className="text-xs text-white/70">
              {new Date(currentVideo.last_watched_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

import { Link as LinkIcon, FolderOpen, Check, Copy, ExternalLink } from 'lucide-react';
import type { VideoItem } from '../../../types';
import type { StorageStats } from './useVideoInfoModal';

interface VideoInfoStorageTabProps {
  currentVideo: VideoItem;
  stats: StorageStats | null;
  copiedField: string | null;
  copyToClipboard: (text: string, field: string) => void;
  handleOpenInFolder: (pathOrName?: string) => Promise<void>;
}

export function VideoInfoStorageTab({
  currentVideo,
  stats,
  copiedField,
  copyToClipboard,
  handleOpenInFolder
}: VideoInfoStorageTabProps) {
  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3.5 animate-fade-in">
      <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
        <LinkIcon size={14} className="text-brand-400" />
        Identificadores e Caminhos do Arquivo
      </h4>
      
      {/* Local Path with One-Click Open in Folder */}
      {currentVideo.is_local && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/40 uppercase font-semibold">Caminho Local no Computador</span>
            <button
              onClick={() => handleOpenInFolder(stats?.original_path || currentVideo.file_path)}
              className="flex items-center gap-1 text-[11px] text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"
            >
              <FolderOpen size={12} />
              <span>Abrir pasta</span>
            </button>
          </div>

          <div 
            onClick={() => handleOpenInFolder(stats?.original_path || currentVideo.file_path)}
            className="group flex items-center justify-between text-xs text-white/80 font-mono bg-black/40 px-3 py-2 rounded-lg hover:bg-black/60 hover:border-brand-500/40 transition-colors text-left border border-white/5 cursor-pointer"
            title="Clique para abrir esta pasta no gerenciador de arquivos do sistema"
          >
            <span className="break-all">{stats?.original_path || currentVideo.file_path || currentVideo.original_name}</span>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(stats?.original_path || currentVideo.file_path || currentVideo.original_name, 'local');
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors text-white/40 group-hover:text-white"
                title="Copiar Caminho"
              >
                {copiedField === 'local' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Original Name */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-white/40 uppercase font-semibold">Nome Original do Arquivo</span>
        <button 
          onClick={() => copyToClipboard(currentVideo.original_name, 'original')}
          className="group flex items-center justify-between text-xs text-white/80 font-mono bg-black/40 px-3 py-2 rounded-lg hover:bg-black/60 transition-colors text-left border border-white/5"
        >
          <span className="break-all">{currentVideo.original_name}</span>
          {copiedField === 'original' ? <Check size={14} className="text-emerald-400 shrink-0 ml-2" /> : <Copy size={14} className="text-white/20 group-hover:text-white/60 shrink-0 ml-2 transition-colors" />}
        </button>
      </div>

      {/* YouTube Link */}
      {currentVideo.youtube_url && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase font-semibold">Link do YouTube</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => copyToClipboard(currentVideo.youtube_url!, 'youtube')}
              className="group flex-1 flex items-center justify-between text-xs text-red-300 font-mono bg-red-500/10 px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors text-left border border-red-500/20"
            >
              <span className="break-all">{currentVideo.youtube_url}</span>
              {copiedField === 'youtube' ? <Check size={14} className="text-emerald-400 shrink-0 ml-2" /> : <Copy size={14} className="text-red-400/40 group-hover:text-red-400 shrink-0 ml-2 transition-colors" />}
            </button>
            <a 
              href={currentVideo.youtube_url} 
              target="_blank" 
              rel="noreferrer"
              className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400 transition-colors"
              title="Abrir no Navegador"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
      
      {/* Google Drive Main ID */}
      {currentVideo.drive_file_id && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase font-semibold">ID do Google Drive (Backup Original)</span>
          <button 
            onClick={() => copyToClipboard(currentVideo.drive_file_id!, 'drive')}
            className="group flex items-center justify-between text-xs text-sky-300 font-mono bg-sky-500/10 px-3 py-2 rounded-lg hover:bg-sky-500/20 transition-colors text-left border border-sky-500/20"
          >
            <span className="break-all">{currentVideo.drive_file_id}</span>
            {copiedField === 'drive' ? <Check size={14} className="text-emerald-400 shrink-0 ml-2" /> : <Copy size={14} className="text-sky-400/40 group-hover:text-sky-400 shrink-0 ml-2 transition-colors" />}
          </button>
        </div>
      )}

      {/* Google Drive Web ID */}
      {currentVideo.drive_web_file_id && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase font-semibold">ID do Google Drive (Web Remux)</span>
          <button 
            onClick={() => copyToClipboard(currentVideo.drive_web_file_id!, 'drive_web')}
            className="group flex items-center justify-between text-xs text-purple-300 font-mono bg-purple-500/10 px-3 py-2 rounded-lg hover:bg-purple-500/20 transition-colors text-left border border-purple-500/20"
          >
            <span className="break-all">{currentVideo.drive_web_file_id}</span>
            {copiedField === 'drive_web' ? <Check size={14} className="text-emerald-400 shrink-0 ml-2" /> : <Copy size={14} className="text-purple-400/40 group-hover:text-purple-400 shrink-0 ml-2 transition-colors" />}
          </button>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import type { VideoItem } from '../../types_video';
import { Play, Cloud, HardDrive, Download, Trash2, MoreVertical } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface VideoGridProps {
  videos: VideoItem[];
  onPlayVideo: (video: VideoItem) => void;
  onDownloadVideo: (video: VideoItem) => void;
  onDeleteLocal: (video: VideoItem) => void;
  onDeleteCloud: (video: VideoItem) => void;
}

export default function VideoGrid({ videos, onPlayVideo, onDownloadVideo, onDeleteLocal, onDeleteCloud }: VideoGridProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {videos.map((video) => (
        <div 
          key={video.id}
          className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1"
        >
          {/* Thumbnail placeholder */}
          <div 
            className="w-full aspect-video bg-black/40 relative flex items-center justify-center cursor-pointer"
            onClick={() => onPlayVideo(video)}
          >
            <div className="w-12 h-12 rounded-full bg-brand-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg">
              <Play fill="currentColor" size={24} className="ml-1" />
            </div>
            
            {/* Status Indicator */}
            <div className="absolute top-3 right-3 flex gap-2">
              {video.is_local ? (
                <div className="bg-green-500/20 text-green-400 p-1.5 rounded-lg backdrop-blur-md" title="Baixado (Local)">
                  <HardDrive size={14} />
                </div>
              ) : (
                <div className="bg-blue-500/20 text-blue-400 p-1.5 rounded-lg backdrop-blur-md" title="No Drive (Nuvem)">
                  <Cloud size={14} />
                </div>
              )}
            </div>

            {/* Duration */}
            <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] font-medium text-white tracking-wider backdrop-blur-md">
              {formatDuration(video.duration)}
            </div>
          </div>

          <div className="p-4 flex items-start justify-between gap-3">
            <div className="flex-1 overflow-hidden">
              <h3 className="text-white font-medium text-sm truncate" title={video.title}>
                {video.title}
              </h3>
              <div className="w-full bg-white/10 h-1 mt-3 rounded-full overflow-hidden">
                <div 
                  className="bg-brand-500 h-full" 
                  style={{ width: `${video.duration ? (video.progress / video.duration) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Context Menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="text-dark-subtext hover:text-white p-1 rounded transition-colors outline-none relative z-10">
                  <MoreVertical size={16} />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content 
                  className="z-50 min-w-[180px] bg-dark-card border border-white/10 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                  sideOffset={5}
                  align="end"
                >
                  {!video.is_local && (
                    <DropdownMenu.Item 
                      className="flex items-center gap-2 px-2 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-colors"
                      onClick={() => onDownloadVideo(video)}
                    >
                      <Download size={14} />
                      Baixar para o PC
                    </DropdownMenu.Item>
                  )}
                  
                  {video.is_local && (
                    <DropdownMenu.Item 
                      className="flex items-center gap-2 px-2 py-1.5 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 rounded-lg cursor-pointer outline-none transition-colors"
                      onClick={() => onDeleteLocal(video)}
                    >
                      <HardDrive size={14} />
                      Excluir localmente
                    </DropdownMenu.Item>
                  )}

                  <DropdownMenu.Separator className="h-px bg-white/10 my-1.5 mx-1" />
                  
                  <DropdownMenu.Item 
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg cursor-pointer outline-none transition-colors"
                    onClick={() => onDeleteCloud(video)}
                  >
                    <Trash2 size={14} />
                    Excluir do Drive
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      ))}

      {videos.length === 0 && (
        <div className="col-span-full py-20 flex flex-col items-center justify-center text-dark-subtext">
          <Cloud size={48} className="mb-4 opacity-20" />
          <p>Nenhum vídeo importado ainda.</p>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import type { VideoItem } from '../../types_video';
import { Play, Cloud, HardDrive, Download, Trash2, MoreVertical } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface VideoGridProps {
  videos: VideoItem[];
  viewMode?: 'grid' | 'list' | 'compact';
  onPlayVideo: (video: VideoItem) => void;
  onDownloadVideo: (video: VideoItem) => void;
  onDeleteLocal: (video: VideoItem) => void;
  onDeleteCloud: (video: VideoItem) => void;
  isDeletingId?: string | null;
}

export default function VideoGrid({ videos, viewMode = 'grid', onPlayVideo, onDownloadVideo, onDeleteLocal, onDeleteCloud, isDeletingId }: VideoGridProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isList = viewMode === 'list' || viewMode === 'compact';
  const isCompact = viewMode === 'compact';

  return (
    <div className={isList ? "flex flex-col gap-2 p-4" : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 p-4"}>
      {videos.map((video) => (
        <div 
          key={video.id}
          className={`group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 ${isDeletingId === video.id ? 'opacity-50 pointer-events-none' : (isList ? 'hover:bg-white/10 cursor-pointer' : 'hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1')} ${isList ? 'flex items-center p-2 gap-4' : 'flex-col'}`}
          onClick={(e) => {
            // Prevent play if clicking the dropdown button
            const target = e.target as HTMLElement;
            if (!target.closest('button')) {
              onPlayVideo(video);
            }
          }}
        >
          {isDeletingId === video.id && (
            <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-medium mt-2 text-white shadow-black drop-shadow-md">Excluindo...</span>
              </div>
            </div>
          )}
          
          {/* Thumbnail placeholder */}
          {!isCompact && (
            <div 
              className={`${isList ? 'w-40 flex-shrink-0 rounded-lg overflow-hidden' : 'w-full'} aspect-video bg-black/40 relative flex items-center justify-center cursor-pointer`}
              onClick={(e) => {
                e.stopPropagation(); // Previne clique duplo se clicar direto na thumbnail
                onPlayVideo(video);
              }}
            >
              <div className="w-10 h-10 rounded-full bg-brand-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg">
                <Play fill="currentColor" size={20} className="ml-1" />
              </div>
              
              {/* Status Indicator */}
              <div className="absolute top-2 right-2 flex gap-1">
                {video.is_local ? (
                  <div className="bg-green-500/20 text-green-400 p-1 rounded-md backdrop-blur-md" title="Baixado (Local)">
                    <HardDrive size={12} />
                  </div>
                ) : (
                  <div className="bg-blue-500/20 text-blue-400 p-1 rounded-md backdrop-blur-md" title="No Drive (Nuvem)">
                    <Cloud size={12} />
                  </div>
                )}
              </div>

              {/* Duration */}
              {video.duration ? (
                <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium text-white tracking-wider backdrop-blur-md">
                  {formatDuration(video.duration)}
                </div>
              ) : null}
            </div>
          )}

          <div className={`${isList ? 'flex-1 p-2' : 'p-3'} flex items-center justify-between gap-2`}>
            {isCompact && (
              <div className="flex-shrink-0 text-brand-500 opacity-50 group-hover:opacity-100 transition-opacity">
                <Play fill="currentColor" size={20} className="ml-1 mr-2" />
              </div>
            )}
            <div className="flex-1 overflow-hidden">
              <h3 className={`text-white font-medium truncate ${isList ? 'text-sm' : 'text-xs'}`} title={video.title}>
                {video.title}
              </h3>
              
              {(isList && !isCompact) && (
                <p className="text-xs text-dark-subtext mt-1">
                  Adicionado em: {video.created_at ? new Date(video.created_at).toLocaleDateString() : '--'}
                </p>
              )}

              {video.progress > 0 && video.duration && (
                <div className="w-full bg-white/10 h-1 mt-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-brand-500 h-full" 
                    style={{ width: `${(video.progress / video.duration) * 100}%` }}
                  />
                </div>
              )}
            </div>

            {isCompact && (
              <div className="flex items-center gap-3 mr-4">
                {video.duration ? (
                  <div className="text-xs font-medium text-dark-subtext bg-white/5 px-2 py-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                ) : null}
                
                {video.is_local ? (
                  <HardDrive size={14} className="text-green-500/80" title="Baixado (Local)" />
                ) : (
                  <Cloud size={14} className="text-blue-500/80" title="No Drive (Nuvem)" />
                )}
              </div>
            )}

            {/* Context Menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="text-white/60 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors focus:outline-none flex-shrink-0">
                  <MoreVertical size={16} />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content 
                  className="z-50 min-w-[180px] bg-dark-card border border-white/10 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                  sideOffset={5}
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!video.is_local && (
                    <DropdownMenu.Item 
                      className="flex items-center gap-2 px-2 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-colors"
                      onSelect={(e) => { 
                        e.stopPropagation(); 
                        setTimeout(() => onDownloadVideo(video), 10); 
                      }}
                    >
                      <Download size={14} />
                      Baixar para o PC
                    </DropdownMenu.Item>
                  )}
                  
                  {video.is_local && (
                    <DropdownMenu.Item 
                      className="flex items-center gap-2 px-2 py-1.5 text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 rounded-lg cursor-pointer outline-none transition-colors"
                      onSelect={(e) => { 
                        e.stopPropagation(); 
                        setTimeout(() => onDeleteLocal(video), 10); 
                      }}
                    >
                      <HardDrive size={14} />
                      Excluir localmente
                    </DropdownMenu.Item>
                  )}

                  <DropdownMenu.Separator className="h-px bg-white/10 my-1.5 mx-1" />
                  
                  <DropdownMenu.Item 
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg cursor-pointer outline-none transition-colors"
                    onSelect={(e) => { 
                      e.stopPropagation(); 
                      setTimeout(() => onDeleteCloud(video), 10); 
                    }}
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

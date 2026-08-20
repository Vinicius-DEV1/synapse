import React from 'react';
import { Play, Cloud, HardDrive, Download, Trash2, MoreVertical, FolderInput, ArrowLeft, Info, Folder, MonitorPlay } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import type { VideoItem } from '../../../types';

interface VideoCardProps {
  video: VideoItem;
  viewMode: 'grid' | 'list' | 'compact';
  isDeleting: boolean;
  isDownloading: boolean;
  downloadProgress?: number;
  availableFolders: { id: string; name: string }[];
  
  onPlayVideo: (video: VideoItem) => void;
  onDownloadVideo: (video: VideoItem) => void;
  onDeleteLocal: (video: VideoItem) => void;
  onDeleteCloud: (video: VideoItem) => void;
  onMoveVideo?: (video: VideoItem, folderId: string | null, folderName: string | null) => void;
  onShowInfo: (video: VideoItem) => void;
  onGenerateWebVersion?: (video: VideoItem) => void;
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const VideoCard = React.memo(({
  video, viewMode, isDeleting, isDownloading, downloadProgress, availableFolders,
  onPlayVideo, onDownloadVideo, onDeleteLocal, onDeleteCloud, onMoveVideo, onShowInfo, onGenerateWebVersion
}: VideoCardProps) => {
  const isList = viewMode === 'list' || viewMode === 'compact';
  const isCompact = viewMode === 'compact';

  return (
    <div 
      className={`group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 ${(isDeleting || isDownloading) ? 'opacity-50 pointer-events-none' : (isList ? 'hover:bg-white/10 cursor-pointer' : 'hover:shadow-xl hover:shadow-brand-500/10 hover:-translate-y-1')} ${isList ? 'flex items-center p-2 gap-4' : 'flex-col'}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('button')) {
          onPlayVideo(video);
        }
      }}
    >
      {isDeleting && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-medium mt-2 text-white shadow-black drop-shadow-md">Excluindo...</span>
          </div>
        </div>
      )}
      {isDownloading && (
        <div className={`absolute inset-0 z-50 bg-black/60 flex items-center justify-center backdrop-blur-sm ${isList ? 'flex-row gap-4 px-4' : 'flex-col'}`}>
          <div className={`flex items-center justify-center ${isList ? 'flex-row gap-3' : 'flex-col'}`}>
            {!isList && <Download className="text-brand-400 mb-2 animate-bounce" size={24} />}
            <div className="relative flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
              {typeof downloadProgress === 'number' && downloadProgress > 0 && (
                <span className="absolute text-[10px] font-bold text-white shadow-black drop-shadow-md">{downloadProgress}%</span>
              )}
            </div>
            <span className={`text-xs font-medium text-white shadow-black drop-shadow-md ${isList ? '' : 'mt-2'}`}>
              Baixando do Drive{typeof downloadProgress === 'number' && downloadProgress > 0 ? ` (${downloadProgress}%)` : '...'}
            </span>
          </div>
        </div>
      )}
      
      {/* Thumbnail */}
      {!isCompact && (
        <div 
          className={`${isList ? 'w-40 flex-shrink-0 rounded-lg overflow-hidden' : 'w-full'} aspect-video bg-black/40 relative flex items-center justify-center cursor-pointer`}
          onClick={(e) => {
            e.stopPropagation();
            onPlayVideo(video);
          }}
        >
          <div className="w-10 h-10 rounded-full bg-brand-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg">
            <Play fill="currentColor" size={20} className="ml-1" />
          </div>
          
          <div className="absolute top-2 right-2 flex gap-1">
            {video.is_local ? (
              <div className="bg-emerald-950/80 border border-emerald-500/30 text-green-400 p-1 rounded-md" title="Baixado (Local)">
                <HardDrive size={12} />
              </div>
            ) : (
              <div className="bg-blue-950/80 border border-blue-500/30 text-blue-400 p-1 rounded-md" title="No Drive (Nuvem)">
                <Cloud size={12} />
              </div>
            )}
          </div>

          {video.duration ? (
            <div className="absolute bottom-2 right-2 bg-black/80 border border-white/10 px-1.5 py-0.5 rounded text-[10px] font-medium text-white tracking-wider">
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
              <span title="Baixado (Local)"><HardDrive size={14} className="text-green-500/80" /></span>
            ) : (
              <span title="No Drive (Nuvem)"><Cloud size={14} className="text-blue-500/80" /></span>
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
              <DropdownMenu.Item 
                className="flex items-center gap-2 px-2 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-colors"
                onSelect={(e) => { 
                  e.preventDefault();
                  setTimeout(() => onShowInfo(video), 10); 
                }}
              >
                <Info size={14} />
                Informações
              </DropdownMenu.Item>

              {onMoveVideo && (
                <DropdownMenu.Sub>
                  <DropdownMenu.SubTrigger className="flex items-center gap-2 px-2 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-colors data-[state=open]:bg-white/10">
                    <FolderInput size={14} />
                    Mover para...
                  </DropdownMenu.SubTrigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.SubContent
                      className="z-[60] min-w-[160px] bg-dark-card border border-white/10 rounded-xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95"
                      sideOffset={8}
                    >
                      {video.collection_id && (
                        <>
                          <DropdownMenu.Item
                            className="flex items-center gap-2 px-2 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-colors"
                            onSelect={() => onMoveVideo(video, null, null)}
                          >
                            <ArrowLeft size={14} />
                            Raiz (sem pasta)
                          </DropdownMenu.Item>
                          {availableFolders.length > 0 && (
                            <DropdownMenu.Separator className="h-px bg-white/10 my-1 mx-1" />
                          )}
                        </>
                      )}
                      {availableFolders.map(f => (
                        <DropdownMenu.Item
                          key={f.id}
                          className="flex items-center gap-2 px-2 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-colors"
                          onSelect={() => onMoveVideo(video, f.id, f.name)}
                        >
                          <Folder size={14} className="text-brand-400/60" />
                          <span className="truncate">{f.name}</span>
                        </DropdownMenu.Item>
                      ))}
                      {availableFolders.length === 0 && !video.collection_id && (
                        <div className="px-2 py-1.5 text-xs text-white/40">
                          Nenhuma pasta criada
                        </div>
                      )}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Portal>
                </DropdownMenu.Sub>
              )}
              
              {video.is_local && onGenerateWebVersion && (
                <DropdownMenu.Item 
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-brand-400 hover:text-brand-300 hover:bg-brand-400/10 rounded-lg cursor-pointer outline-none transition-colors"
                  onSelect={(e) => { 
                    e.preventDefault();
                    setTimeout(() => onGenerateWebVersion(video), 10); 
                  }}
                >
                  <MonitorPlay size={14} />
                  Gerar Versão Web...
                </DropdownMenu.Item>
              )}
              
              {!video.is_local && (
                <DropdownMenu.Item 
                  className="flex items-center gap-2 px-2 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer outline-none transition-colors"
                  onSelect={(e) => { 
                    e.preventDefault();
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
                    e.preventDefault();
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
                  e.preventDefault();
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
  );
});
VideoCard.displayName = 'VideoCard';

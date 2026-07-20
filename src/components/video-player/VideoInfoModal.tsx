import React from 'react';
import { X, Info, HardDrive, Cloud, Languages, MessageSquare, Clock, Link as LinkIcon, MonitorPlay } from 'lucide-react';
import type { VideoItem, TrackItem } from '../../types';

interface VideoInfoModalProps {
  video: VideoItem;
  onClose: () => void;
}

export default function VideoInfoModal({ video, onClose }: VideoInfoModalProps) {
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    const h = Math.floor(seconds / 3600);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const getYoutubeThumb = (url?: string) => {
    if (!url) return null;
    const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
    return null;
  };

  const thumbUrl = getYoutubeThumb(video.youtube_url);
  
  let audioTracks: TrackItem[] = [];
  let subtitleTracks: TrackItem[] = [];
  try {
    if (video.audio_tracks_json) audioTracks = JSON.parse(video.audio_tracks_json);
    if (video.subtitles_json) subtitleTracks = JSON.parse(video.subtitles_json);
  } catch(e) {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-dark-card border border-white/10 rounded-2xl w-[600px] max-w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-white font-medium flex items-center gap-2">
            <Info size={18} className="text-brand-400" />
            Informações do Vídeo
          </h2>
          <button onClick={onClose} className="text-dark-subtext hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex flex-col gap-6">
          
          {/* Cover & Basic Info */}
          <div className="flex gap-4">
            {thumbUrl ? (
              <img src={thumbUrl} alt="Thumbnail" className="w-40 aspect-video object-cover rounded-lg border border-white/10 shadow-md" />
            ) : (
              <div className="w-40 aspect-video bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                <Info size={32} className="text-white/20" />
              </div>
            )}
            
            <div className="flex flex-col justify-start gap-2 flex-1">
              <h3 className="text-lg font-bold text-white leading-tight">{video.title}</h3>
              
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded text-xs text-white/80">
                  <Clock size={12} className="text-brand-400" />
                  {formatDuration(video.duration)}
                </span>
                
                {video.is_local ? (
                  <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded text-xs text-green-400">
                    <HardDrive size={12} /> Local
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded text-xs text-blue-400">
                    <Cloud size={12} /> Nuvem
                  </span>
                )}

                {video.youtube_url && (
                  <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded text-xs text-red-400">
                    <MonitorPlay size={12} /> YouTube
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {video.youtube_description && (
            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <h4 className="text-xs font-medium text-dark-subtext uppercase tracking-wider mb-2">Descrição</h4>
              <p className="text-sm text-white/80 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar leading-relaxed">
                {video.youtube_description}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Audio Tracks */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <h4 className="text-xs font-medium text-dark-subtext uppercase tracking-wider mb-3 flex items-center gap-2">
                <Languages size={14} className="text-brand-400" />
                Idiomas (Áudio)
              </h4>
              {audioTracks.length > 0 ? (
                <ul className="space-y-2">
                  {audioTracks.map((track, idx) => (
                    <li key={idx} className="text-sm text-white/90 bg-black/20 px-2 py-1.5 rounded flex items-center justify-between">
                      <span className="capitalize">{track.label || 'Desconhecido'}</span>
                      <span className="text-xs text-white/40">{track.id}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/50">Áudio nativo apenas</p>
              )}
            </div>

            {/* Subtitle Tracks */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-4">
              <h4 className="text-xs font-medium text-dark-subtext uppercase tracking-wider mb-3 flex items-center gap-2">
                <MessageSquare size={14} className="text-purple-400" />
                Legendas Embutidas
              </h4>
              {subtitleTracks.length > 0 ? (
                <ul className="space-y-2">
                  {subtitleTracks.map((track, idx) => (
                    <li key={idx} className="text-sm text-white/90 bg-black/20 px-2 py-1.5 rounded flex items-center justify-between">
                      <span className="capitalize">{track.label || 'Desconhecida'}</span>
                      <span className="text-xs text-white/40">{track.id}</span>
                    </li>
                  ))}
                </ul>
              ) : video.local_subtitle_path ? (
                <p className="text-sm text-white/90 bg-purple-500/10 px-2 py-1.5 rounded border border-purple-500/20 flex items-center justify-between">
                  <span className="truncate pr-2" title={video.local_subtitle_path.split(/[\\/]/).pop() || 'Legenda'}>
                    {video.local_subtitle_path.split(/[\\/]/).pop() || 'Legenda.vtt'}
                  </span>
                  <span className="text-xs text-purple-400/80 flex-shrink-0">Padrão</span>
                </p>
              ) : (
                <p className="text-sm text-white/50">Nenhuma legenda encontrada</p>
              )}
            </div>
          </div>

          {/* Paths Info */}
          <div className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-medium text-dark-subtext uppercase tracking-wider mb-1 flex items-center gap-2">
              <LinkIcon size={14} className="text-white/50" />
              Caminhos do Arquivo
            </h4>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-white/40 uppercase font-medium">Nome Original</span>
              <span className="text-xs text-white/70 font-mono bg-black/40 px-2 py-1 rounded truncate">
                {video.original_name}
              </span>
            </div>

            {video.youtube_url && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase font-medium">Link do YouTube</span>
                <a href={video.youtube_url} target="_blank" rel="noreferrer" className="text-xs text-brand-400 font-mono bg-brand-500/10 px-2 py-1 rounded truncate hover:underline">
                  {video.youtube_url}
                </a>
              </div>
            )}

            {video.is_local && video.file_path && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase font-medium">Caminho Local</span>
                <span className="text-xs text-white/70 font-mono bg-black/40 px-2 py-1 rounded truncate" title={video.file_path}>
                  {video.file_path}
                </span>
              </div>
            )}
            
            {video.drive_file_id && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase font-medium">Drive ID (Backup)</span>
                <span className="text-xs text-white/70 font-mono bg-black/40 px-2 py-1 rounded truncate">
                  {video.drive_file_id}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/5 bg-white/[0.02] flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

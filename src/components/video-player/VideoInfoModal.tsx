import { useState, useEffect } from 'react';
import { X, Info, HardDrive, Cloud, Languages, MessageSquare, Clock, Link as LinkIcon, MonitorPlay, Copy, Check, FileVideo } from 'lucide-react';
import type { VideoItem, TrackItem } from '../../types';
import { Portal } from '../ui/Portal';
import { formatBytes, formatHumanDuration } from '../../utils/format';

interface VideoInfoModalProps {
  // `local_subtitle_path` extended optional field on VideoItem,
  // used for standalone subtitles downloaded from YouTube.
  video: VideoItem & { local_subtitle_path?: string };
  onClose: () => void;
}

export default function VideoInfoModal({ video, onClose }: VideoInfoModalProps) {
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (video.is_local && video.file_path) {
      import('@tauri-apps/plugin-fs').then(fs => {
        fs.stat(video.file_path as string).then(info => {
          if (info && info.size) {
            setFileSize(formatBytes(info.size));
          }
        }).catch(() => {});
      }).catch(() => {});
    }
  }, [video]);

  const formatDuration = (seconds?: number) =>
    formatHumanDuration(seconds, { includeSeconds: true, fallback: '--:--' });

  const getYoutubeThumb = (url?: string) => {
    if (!url) return null;
    const match = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
    return null;
  };

  const getExtension = (filename: string) => {
    if (!filename) return 'UNKNOWN';
    return filename.split('.').pop()?.toUpperCase() || 'UNKNOWN';
  };

  const copyToClipboard = (text: string, field: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const thumbUrl = getYoutubeThumb(video.youtube_url);
  
  let audioTracks: TrackItem[] = [];
  let subtitleTracks: TrackItem[] = [];
  try {
    if (video.audio_tracks_json) audioTracks = JSON.parse(video.audio_tracks_json);
    if (video.subtitles_json) subtitleTracks = JSON.parse(video.subtitles_json);
  } catch(e) {}

  return (
    <Portal>
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

          {/* Versions Info */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-4">
             <h4 className="text-xs font-medium text-dark-subtext uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileVideo size={14} className="text-brand-400" />
                Versões do Vídeo
             </h4>
             <ul className="space-y-2">
               {video.is_local && video.file_path && (
                 <li className="text-sm text-white/90 bg-black/20 px-3 py-2 rounded flex items-center justify-between border border-white/5">
                   <div className="flex items-center gap-2">
                     <span className="font-medium">Versão Local</span>
                     <span className="text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded">{getExtension(video.file_path)}</span>
                   </div>
                   <span className="text-xs text-white/50">{fileSize || 'Calculando tamanho...'}</span>
                 </li>
               )}
               {video.drive_file_id && (
                 <li className="text-sm text-white/90 bg-black/20 px-3 py-2 rounded flex items-center justify-between border border-white/5">
                   <div className="flex items-center gap-2">
                     <span className="font-medium">Original na Nuvem (Drive)</span>
                     <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{getExtension(video.original_name)}</span>
                   </div>
                   <span className="text-xs text-white/50">Criptografado</span>
                 </li>
               )}
               {video.drive_web_file_id && (
                 <li className="text-sm text-white/90 bg-black/20 px-3 py-2 rounded flex items-center justify-between border border-white/5">
                   <div className="flex items-center gap-2">
                     <span className="font-medium">Web Remux na Nuvem (Drive)</span>
                     <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">MP4</span>
                   </div>
                   <span className="text-xs text-white/50">Criptografado</span>
                 </li>
               )}
               {!video.is_local && !video.drive_file_id && !video.drive_web_file_id && !video.youtube_url && (
                 <li className="text-sm text-white/50">Nenhuma versão encontrada</li>
               )}
             </ul>
          </div>

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
              <button 
                onClick={() => copyToClipboard(video.original_name, 'original')}
                className="group flex items-center justify-between text-xs text-white/70 font-mono bg-black/40 px-2 py-1 rounded hover:bg-black/60 transition-colors text-left"
              >
                <span className="break-all">{video.original_name}</span>
                {copiedField === 'original' ? <Check size={14} className="text-green-400 flex-shrink-0 ml-2" /> : <Copy size={14} className="text-white/20 group-hover:text-white/60 flex-shrink-0 ml-2 transition-colors" />}
              </button>
            </div>

            {video.youtube_url && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase font-medium">Link do YouTube</span>
                <button 
                  onClick={() => copyToClipboard(video.youtube_url!, 'youtube')}
                  className="group flex items-center justify-between text-xs text-brand-400 font-mono bg-brand-500/10 px-2 py-1 rounded hover:bg-brand-500/20 transition-colors text-left"
                >
                  <span className="break-all">{video.youtube_url}</span>
                  {copiedField === 'youtube' ? <Check size={14} className="text-green-400 flex-shrink-0 ml-2" /> : <Copy size={14} className="text-brand-400/40 group-hover:text-brand-400 flex-shrink-0 ml-2 transition-colors" />}
                </button>
              </div>
            )}

            {video.is_local && video.file_path && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase font-medium">Caminho Local</span>
                <button 
                  onClick={() => copyToClipboard(video.file_path!, 'local')}
                  className="group flex items-center justify-between text-xs text-white/70 font-mono bg-black/40 px-2 py-1 rounded hover:bg-black/60 transition-colors text-left"
                >
                  <span className="break-all">{video.file_path}</span>
                  {copiedField === 'local' ? <Check size={14} className="text-green-400 flex-shrink-0 ml-2" /> : <Copy size={14} className="text-white/20 group-hover:text-white/60 flex-shrink-0 ml-2 transition-colors" />}
                </button>
              </div>
            )}
            
            {video.drive_file_id && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase font-medium">Drive ID (Backup Original)</span>
                <button 
                  onClick={() => copyToClipboard(video.drive_file_id!, 'drive')}
                  className="group flex items-center justify-between text-xs text-white/70 font-mono bg-black/40 px-2 py-1 rounded hover:bg-black/60 transition-colors text-left"
                >
                  <span className="break-all">{video.drive_file_id}</span>
                  {copiedField === 'drive' ? <Check size={14} className="text-green-400 flex-shrink-0 ml-2" /> : <Copy size={14} className="text-white/20 group-hover:text-white/60 flex-shrink-0 ml-2 transition-colors" />}
                </button>
              </div>
            )}

            {video.drive_web_file_id && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/40 uppercase font-medium">Drive ID (Backup Web)</span>
                <button 
                  onClick={() => copyToClipboard(video.drive_web_file_id!, 'drive_web')}
                  className="group flex items-center justify-between text-xs text-white/70 font-mono bg-black/40 px-2 py-1 rounded hover:bg-black/60 transition-colors text-left"
                >
                  <span className="break-all">{video.drive_web_file_id}</span>
                  {copiedField === 'drive_web' ? <Check size={14} className="text-green-400 flex-shrink-0 ml-2" /> : <Copy size={14} className="text-white/20 group-hover:text-white/60 flex-shrink-0 ml-2 transition-colors" />}
                </button>
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
    </Portal>
  );
}

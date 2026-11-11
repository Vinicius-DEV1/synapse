import type React from 'react';
import { Languages, MessageSquare, Plus, Loader2, Edit2, Trash2, Check, X } from 'lucide-react';
import type { VideoItem, TrackItem } from '../../../types';
import type { StorageStats } from './useVideoInfoModal';
import { formatBytes } from '../../../utils/format';

interface VideoInfoTracksTabProps {
  currentVideo: VideoItem & { local_subtitle_path?: string };
  audioTracks: TrackItem[];
  subtitleTracks: TrackItem[];
  stats: StorageStats | null;
  isProcessingSub: boolean;
  editingTrackId: string | null;
  setEditingTrackId: (id: string | null) => void;
  editLabelValue: string;
  setEditLabelValue: (val: string) => void;
  subFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAddSubtitle: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRemoveSubtitle: (trackId: string, label: string) => Promise<void>;
  handleSaveRename: (trackId: string) => Promise<void>;
}

export function VideoInfoTracksTab({
  currentVideo,
  audioTracks,
  subtitleTracks,
  stats,
  isProcessingSub,
  editingTrackId,
  setEditingTrackId,
  editLabelValue,
  setEditLabelValue,
  subFileInputRef,
  handleAddSubtitle,
  handleRemoveSubtitle,
  handleSaveRename
}: VideoInfoTracksTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
      {/* Audio Tracks Column */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex flex-col">
        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Languages size={14} className="text-brand-400" />
          Idiomas de Áudio ({audioTracks.length})
        </h4>
        {audioTracks.length > 0 ? (
          <ul className="space-y-2 flex-1">
            {audioTracks.map((track, idx) => {
              const fname = track.local_path?.split(/[\\/]/).pop() || '';
              const trackSize = fname && stats?.audio_sizes[fname] ? formatBytes(stats.audio_sizes[fname]) : null;

              return (
                <li key={idx} className="text-xs sm:text-sm text-white/90 bg-black/30 px-3 py-2.5 rounded-lg flex items-center justify-between border border-white/5">
                  <div className="flex flex-col min-w-0">
                    <span className="capitalize font-medium truncate">{track.label || 'Áudio Desconhecido'}</span>
                    <span className="text-[10px] text-white/40 font-mono">{track.id}</span>
                  </div>
                  {trackSize && (
                    <span className="text-xs text-white/60 font-mono shrink-0 ml-2">{trackSize}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-white/40 italic py-3">Áudio nativo embutido no contêiner.</p>
        )}
      </div>

      {/* Subtitle Tracks Column */}
      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <MessageSquare size={14} className="text-purple-400" />
            Legendas ({subtitleTracks.length})
          </h4>
          <div>
            <input
              type="file"
              accept=".srt,.vtt"
              ref={subFileInputRef as React.RefObject<HTMLInputElement>}
              className="hidden"
              onChange={handleAddSubtitle}
              disabled={isProcessingSub}
            />
            <button
              type="button"
              onClick={() => subFileInputRef.current?.click()}
              disabled={isProcessingSub}
              className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-white bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {isProcessingSub ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              <span>Adicionar</span>
            </button>
          </div>
        </div>

        {subtitleTracks.length > 0 ? (
          <ul className="space-y-2 flex-1">
            {subtitleTracks.map((track, idx) => {
              const isRedundant = track.label?.toLowerCase() === `legenda ${track.id.toLowerCase()}`;
              const label = isRedundant ? 'Legenda Embutida' : track.label || 'Desconhecida';
              const isEditing = editingTrackId === track.id;

              const fname = track.local_path?.split(/[\\/]/).pop() || '';
              const trackSize = fname && stats?.subtitle_sizes[fname] ? formatBytes(stats.subtitle_sizes[fname]) : null;

              return (
                <li key={idx} className="text-xs sm:text-sm text-white/90 bg-black/30 px-3 py-2 rounded-lg flex items-center justify-between border border-white/5 gap-2 group">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input
                        type="text"
                        value={editLabelValue}
                        onChange={(e) => setEditLabelValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(track.id);
                          if (e.key === 'Escape') setEditingTrackId(null);
                        }}
                        autoFocus
                        className="bg-black/60 border border-purple-500/50 text-white text-xs px-2 py-1 rounded outline-none w-full"
                      />
                      <button
                        onClick={() => handleSaveRename(track.id)}
                        disabled={isProcessingSub}
                        className="p-1 text-emerald-400 hover:text-emerald-300 rounded transition-colors"
                        title="Salvar"
                      >
                        <Check size={13} />
                      </button>
                      <button
                        onClick={() => setEditingTrackId(null)}
                        className="p-1 text-white/50 hover:text-white rounded transition-colors"
                        title="Cancelar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="capitalize truncate font-medium text-xs text-white/90" title={label}>{label}</span>
                        {trackSize && <span className="text-[10px] text-white/40 font-mono">{trackSize}</span>}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-white/40 font-mono hidden sm:inline">{track.id}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTrackId(track.id);
                            setEditLabelValue(label);
                          }}
                          disabled={isProcessingSub}
                          className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
                          title="Renomear Legenda"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtitle(track.id, label)}
                          disabled={isProcessingSub}
                          className="p-1 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Remover Legenda"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        ) : currentVideo.local_subtitle_path ? (
          <p className="text-xs text-white/90 bg-purple-500/10 px-3 py-2 rounded-lg border border-purple-500/20 flex items-center justify-between">
            <span className="truncate pr-2" title={currentVideo.local_subtitle_path}>
              {currentVideo.local_subtitle_path.split(/[\\/]/).pop() || 'Legenda.vtt'}
            </span>
            <span className="text-[10px] text-purple-300 font-medium">Padrão</span>
          </p>
        ) : (
          <p className="text-xs text-white/40 py-3 italic">Nenhuma legenda anexada. Clique em Adicionar para carregar um .srt ou .vtt.</p>
        )}
      </div>
    </div>
  );
}

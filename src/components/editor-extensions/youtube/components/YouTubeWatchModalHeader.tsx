import React from 'react';
import { Play, Tv, ExternalLink, X } from 'lucide-react';

interface YouTubeWatchModalHeaderProps {
  displayTitle: string;
  channel?: string | null;
  displayResolution: string;
  isUsingEmbedFallback: boolean;
  videoId: string | null;
  onTogglePlayerMode: () => void;
  onOpenExternal: () => void;
  onClose: () => void;
}

export const YouTubeWatchModalHeader: React.FC<YouTubeWatchModalHeaderProps> = ({
  displayTitle,
  channel,
  displayResolution,
  isUsingEmbedFallback,
  videoId,
  onTogglePlayerMode,
  onOpenExternal,
  onClose,
}) => {
  return (
    <div className="h-13 px-4 py-2.5 bg-zinc-900/90 border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
          <Play className="w-4 h-4 text-red-400 fill-red-400" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-100 truncate" title={displayTitle}>
              {displayTitle}
            </h3>
            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 text-[10px] font-mono px-2 py-0.5 rounded-full font-medium shrink-0">
              {isUsingEmbedFallback ? 'YouTube HD' : displayResolution}
            </span>
            <span className="hidden sm:inline-flex bg-brand-500/15 text-brand-300 border border-brand-500/25 text-[10px] px-2 py-0.5 rounded-full shrink-0">
              {isUsingEmbedFallback ? 'Player Embutido' : 'yt-dlp stream'}
            </span>
          </div>
          {channel && (
            <p className="text-xs text-zinc-400 truncate">{channel}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {videoId && (
          <button
            type="button"
            onClick={onTogglePlayerMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all ${
              isUsingEmbedFallback
                ? 'bg-brand-500/15 text-brand-300 border-brand-500/30 hover:bg-brand-500/25'
                : 'bg-white/5 text-zinc-300 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
            title={isUsingEmbedFallback ? 'Alternar para Stream Nativo (yt-dlp)' : 'Alternar para Player Embutido (iframe)'}
          >
            <Tv className="w-3.5 h-3.5 text-brand-400" />
            <span className="hidden md:inline">
              {isUsingEmbedFallback ? 'Stream Nativo' : 'Player Embutido'}
            </span>
          </button>
        )}
        <button
          onClick={onOpenExternal}
          title="Abrir no YouTube externo"
          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-white/10 mx-0.5" />
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-white/10 rounded-lg transition-colors"
          title="Fechar (Esc)"
        >
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/[0.06] border border-white/[0.1] rounded text-zinc-400">
            Esc
          </kbd>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

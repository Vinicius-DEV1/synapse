import React from 'react';
import { AlertCircle, RotateCcw, Tv, ExternalLink } from 'lucide-react';

interface YouTubeWatchModalErrorProps {
  error: string;
  videoId: string | null;
  onRetry: () => void;
  onSwitchToEmbed: () => void;
  onOpenExternal: () => void;
}

export const YouTubeWatchModalError: React.FC<YouTubeWatchModalErrorProps> = ({
  error,
  videoId,
  onRetry,
  onSwitchToEmbed,
  onOpenExternal,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950/95 p-6 text-center z-20">
      <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-400" />
      </div>
      <div className="max-w-md">
        <h4 className="text-sm font-semibold text-zinc-100">
          Não foi possível reproduzir via streaming nativo
        </h4>
        <p className="text-xs text-zinc-400 mt-1.5 line-clamp-3">
          {error}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Tentar Novamente
        </button>
        {videoId && (
          <button
            onClick={onSwitchToEmbed}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-300 bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/30 rounded-lg transition-colors"
          >
            <Tv className="w-3.5 h-3.5" />
            Usar Player Embutido (iframe)
          </button>
        )}
        <button
          onClick={onOpenExternal}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10 rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Assistir no YouTube
        </button>
      </div>
    </div>
  );
};

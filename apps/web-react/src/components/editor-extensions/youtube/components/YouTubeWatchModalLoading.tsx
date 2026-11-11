import React from 'react';
import { Loader2, Play, Tv } from 'lucide-react';

interface YouTubeWatchModalLoadingProps {
  videoId: string | null;
  onSwitchToEmbed: () => void;
}

export const YouTubeWatchModalLoading: React.FC<YouTubeWatchModalLoadingProps> = ({
  videoId,
  onSwitchToEmbed,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 z-20">
      <div className="relative">
        <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
        <Play className="w-4 h-4 text-brand-400 fill-brand-400 absolute inset-0 m-auto" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-200">
          Conectando stream 720p via yt-dlp...
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Bufferizando diretamente sem download prévio
        </p>
      </div>
      {videoId && (
        <button
          type="button"
          onClick={onSwitchToEmbed}
          className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
        >
          <Tv className="w-3.5 h-3.5 text-brand-400" />
          <span>Iniciar imediatamente com Player Embutido</span>
        </button>
      )}
    </div>
  );
};

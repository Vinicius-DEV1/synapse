import { useState, useEffect, memo } from 'react';
import { Play, Film, ExternalLink, X, Search, Loader2 } from 'lucide-react';
import type { CultureType } from '../../../types';
import {
  CultureTrailerService,
  getYoutubeEmbedUrl,
  getYoutubeSearchUrl,
  type TrailerInfo,
} from '../../../services/culture/culture-trailer';

interface Props {
  title: string;
  type?: CultureType | string;
  year?: number | null;
  apiId?: string;
  apiSource?: string;
  trailerUrl?: string;
  trailerYtId?: string;
  accessLink?: string;
  className?: string;
}

export const CultureTrailerSection = memo(function CultureTrailerSection({
  title,
  type = 'filme',
  year,
  apiId,
  apiSource,
  trailerUrl,
  trailerYtId,
  accessLink,
  className = '',
}: Props) {
  const [trailer, setTrailer] = useState<TrailerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasResolved, setHasResolved] = useState(false);

  const isVideoMedium = type === 'filme' || type === 'série' || type === 'anime';

  useEffect(() => {
    let isMounted = true;
    setIsPlaying(false);
    setHasResolved(false);

    // If direct YouTube ID/URL is already known, resolve synchronously
    const directId = CultureTrailerService.extractYoutubeId(trailerYtId) ||
      CultureTrailerService.extractYoutubeId(trailerUrl) ||
      (accessLink ? CultureTrailerService.extractYoutubeId(accessLink) : null);

    if (directId) {
      setTrailer({
        youtubeId: directId,
        embedUrl: getYoutubeEmbedUrl(directId),
        watchUrl: CultureTrailerService.getYoutubeWatchUrl(directId),
        source: 'direct',
      });
      setHasResolved(true);
      return;
    }

    if (!isVideoMedium) {
      setHasResolved(true);
      return;
    }

    setLoading(true);
    CultureTrailerService.resolveTrailer({
      title,
      type,
      year,
      api_id: apiId,
      api_source: apiSource,
      trailer_url: trailerUrl,
      trailer_yt_id: trailerYtId,
      access_link: accessLink,
    })
      .then((resolved) => {
        if (isMounted) {
          setTrailer(resolved);
          setHasResolved(true);
        }
      })
      .catch((err) => {
        console.warn('[CultureTrailerSection] Falha ao resolver trailer:', err);
        if (isMounted) setHasResolved(true);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [title, type, year, apiId, apiSource, trailerUrl, trailerYtId, accessLink, isVideoMedium]);

  const handleOpenExternal = (url: string) => {
    if (window.api?.drive?.openExternalUrl) {
      window.api.drive.openExternalUrl(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const searchUrl = getYoutubeSearchUrl(title, type);

  // If loading and we don't have a trailer yet, render a subtle loader
  if (loading && !trailer) {
    return (
      <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-zinc-400 ${className}`}>
        <Loader2 size={14} className="animate-spin text-zinc-500" />
        <span>Localizando trailer oficial...</span>
      </div>
    );
  }

  // Active playing view: 16:9 embedded player with controls
  if (isPlaying && trailer) {
    return (
      <div className={`space-y-2 animate-fade-in ${className}`}>
        <div className="flex items-center justify-between px-1 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-red-400">
            <Film size={13} />
            <span>Trailer Oficial: {title}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenExternal(trailer.watchUrl)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors border border-white/5"
              title="Assistir diretamente no YouTube"
            >
              <ExternalLink size={11} />
              <span>YouTube</span>
            </button>
            <button
              onClick={() => setIsPlaying(false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 text-[11px] font-medium text-zinc-400 hover:text-rose-300 transition-colors border border-white/5"
              title="Ocultar vídeo"
            >
              <X size={12} />
              <span>Ocultar</span>
            </button>
          </div>
        </div>

        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/10 shadow-2xl">
          <iframe
            src={getYoutubeEmbedUrl(trailer.youtubeId, true)}
            title={`Trailer oficial de ${title}`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  // Trailer available: Sleek play button with YouTube badge
  if (trailer) {
    return (
      <div className={`flex items-center gap-2.5 flex-wrap ${className}`}>
        <button
          onClick={() => setIsPlaying(true)}
          className="group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600/20 to-red-500/10 hover:from-red-600/30 hover:to-red-500/20 text-red-300 hover:text-red-200 border border-red-500/30 hover:border-red-500/50 text-xs font-semibold shadow-sm transition-all duration-150 active:scale-[0.98]"
        >
          <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
            <Play size={11} className="fill-red-400 text-red-400 ml-0.5" />
          </div>
          <span>Assistir Trailer Oficial</span>
        </button>

        <button
          onClick={() => handleOpenExternal(trailer.watchUrl)}
          className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors border border-white/5"
          title="Abrir no YouTube em nova janela"
        >
          <ExternalLink size={13} />
        </button>
      </div>
    );
  }

  // Fallback: If checked and no trailer was found for a movie/series/anime, provide YouTube search
  if (hasResolved && isVideoMedium) {
    return (
      <div className={`flex items-center ${className}`}>
        <button
          onClick={() => handleOpenExternal(searchUrl)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-200 text-xs font-medium border border-white/5 transition-colors"
          title="Buscar trailer no YouTube"
        >
          <Search size={12} className="text-zinc-500" />
          <span>Buscar Trailer no YouTube</span>
          <ExternalLink size={10} className="text-zinc-500" />
        </button>
      </div>
    );
  }

  return null;
});

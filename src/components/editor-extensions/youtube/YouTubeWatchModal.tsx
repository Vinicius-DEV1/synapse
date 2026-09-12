import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Loader2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Tv,
} from 'lucide-react';
import { Portal } from '../../ui/Portal';
import type { YouTubeStreamInfo } from '../../../api/types';
import { extractYouTubeVideoId } from '../../../services/youtube/youtubeSummaryService';

/**
 * Builds a local proxy URL for a YouTube CDN stream.
 * Routes through the Rust Axum server's /youtube-proxy endpoint which
 * forwards requests with a browser User-Agent, avoiding GStreamer's UA being blocked.
 */
function buildProxyUrl(port: number, rawUrl: string, mime: string): string {
  const encoded = encodeURIComponent(rawUrl);
  return `http://127.0.0.1:${port}/youtube-proxy?url=${encoded}&mime=${encodeURIComponent(mime)}`;
}

interface YouTubeWatchModalProps {
  url: string;
  title?: string | null;
  channel?: string | null;
  onClose: () => void;
  onFallbackToEmbed?: () => void;
}

export default function YouTubeWatchModal({
  url,
  title,
  channel,
  onClose,
}: YouTubeWatchModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamInfo, setStreamInfo] = useState<YouTubeStreamInfo | null>(null);
  const [isUsingEmbedFallback, setIsUsingEmbedFallback] = useState(false);
  const [streamPort, setStreamPort] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const syncLoopRef = useRef<number | undefined>(undefined);
  const isMountedRef = useRef(true);

  const videoId = extractYouTubeVideoId(url);

  // Fetch the local stream server port for proxying YouTube CDN requests
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (window.api?.video?.getStreamPort) {
          const port = await window.api.video.getStreamPort();
          if (!cancelled) setStreamPort(port);
        }
      } catch (err) {
        console.warn('[YouTubeWatchModal] Could not get stream port:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch 720p stream info via native yt-dlp
  const loadStream = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!window.api?.youtube?.getStream) {
        throw new Error('Streaming nativo via yt-dlp está disponível apenas no app desktop.');
      }
      const info = await window.api.youtube.getStream(url);
      if (!isMountedRef.current) return;
      setStreamInfo(info);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[YouTubeWatchModal] Failed to get yt-dlp stream:', msg);
      setError(msg);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [url]);

  useEffect(() => {
    isMountedRef.current = true;
    loadStream();

    return () => {
      isMountedRef.current = false;
      if (syncLoopRef.current) {
        cancelAnimationFrame(syncLoopRef.current);
      }
    };
  }, [loadStream]);

  // Strict memory teardown when streamInfo or component unmounts or switches to embed
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    if (isUsingEmbedFallback) {
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          // Ignore any DOM exception on teardown
        }
      }
      if (audio) {
        try {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        } catch {
          // Ignore any DOM exception on teardown
        }
      }
    }

    return () => {
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          // Ignore any DOM exception on teardown
        }
      }
      if (audio) {
        try {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        } catch {
          // Ignore any DOM exception on teardown
        }
      }
    };
  }, [streamInfo, isUsingEmbedFallback]);

  // Removed: Auto-fallback stall detection is no longer needed.
  // The local reverse proxy eliminates the GStreamer User-Agent 403 root cause.

  // Audio-video sync for separated DASH streams
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio || !streamInfo?.audio_url || isUsingEmbedFallback) return;

    // Sync initial audio volume and mute state
    audio.volume = video.volume;
    audio.muted = video.muted;

    const handlePlay = () => {
      audio.play().catch(() => {});
    };

    const handlePause = () => {
      audio.pause();
    };

    const handleSeeking = () => {
      audio.currentTime = video.currentTime;
      audio.pause();
    };

    const handleSeeked = () => {
      audio.currentTime = video.currentTime;
      if (!video.paused) {
        audio.play().catch(() => {});
      }
    };

    const handleWaiting = () => {
      audio.pause();
    };

    const handlePlaying = () => {
      audio.currentTime = video.currentTime;
      if (!video.paused) {
        audio.play().catch(() => {});
      }
    };

    const handleRateChange = () => {
      audio.playbackRate = video.playbackRate;
    };

    const handleVolumeChange = () => {
      audio.volume = video.volume;
      audio.muted = video.muted;
    };

    const handleEnded = () => {
      audio.pause();
      audio.currentTime = 0;
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ended', handleEnded);

    // Micro-sync RAF loop to correct any minor playback drift (> 250ms)
    const syncAudio = () => {
      if (video && audio && !video.paused && !video.seeking && !audio.seeking) {
        const drift = Math.abs(video.currentTime - audio.currentTime);
        if (drift > 0.25) {
          audio.currentTime = video.currentTime;
        }
      }
      syncLoopRef.current = requestAnimationFrame(syncAudio);
    };
    syncLoopRef.current = requestAnimationFrame(syncAudio);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ended', handleEnded);
      if (syncLoopRef.current) {
        cancelAnimationFrame(syncLoopRef.current);
      }
    };
  }, [streamInfo, isUsingEmbedFallback]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          return;
        }
        e.preventDefault();
        onClose();
        return;
      }

      // If in embed fallback mode, allow the YouTube iframe to handle playback shortcuts
      if (isUsingEmbedFallback) {
        return;
      }

      if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
          } else {
            videoRef.current.pause();
          }
        }
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(
            videoRef.current.duration || Infinity,
            videoRef.current.currentTime + 5
          );
        }
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (!document.fullscreenElement && containerRef.current) {
          containerRef.current.requestFullscreen().catch(() => {});
        } else if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.muted = !videoRef.current.muted;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isUsingEmbedFallback]);

  const handleOpenExternal = () => {
    if (window.api?.os?.openInBrowser) {
      window.api.os.openInBrowser(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const displayTitle = streamInfo?.title || title || 'Vídeo do YouTube';
  const displayResolution = streamInfo?.resolution || '720p';

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-fade-in select-none"
        onClick={onClose}
      >
        <div
          ref={containerRef}
          className="relative w-full max-w-5xl bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
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
                  onClick={() => {
                    if (isUsingEmbedFallback) {
                      setIsUsingEmbedFallback(false);
                      if (!streamInfo) loadStream();
                    } else {
                      setIsUsingEmbedFallback(true);
                    }
                  }}
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
                onClick={handleOpenExternal}
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

          {/* Video Player Canvas */}
          <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
            {loading && !isUsingEmbedFallback && (
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
                    onClick={() => setIsUsingEmbedFallback(true)}
                    className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                  >
                    <Tv className="w-3.5 h-3.5 text-brand-400" />
                    <span>Iniciar imediatamente com Player Embutido</span>
                  </button>
                )}
              </div>
            )}

            {error && !isUsingEmbedFallback && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-950/95 p-6 text-center z-20">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-6 h-6" />
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
                    onClick={loadStream}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Tentar Novamente
                  </button>
                  {videoId && (
                    <button
                      onClick={() => setIsUsingEmbedFallback(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-300 bg-brand-500/15 hover:bg-brand-500/25 border border-brand-500/30 rounded-lg transition-colors"
                    >
                      <Tv className="w-3.5 h-3.5" />
                      Usar Player Embutido (iframe)
                    </button>
                  )}
                  <button
                    onClick={handleOpenExternal}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Assistir no YouTube
                  </button>
                </div>
              </div>
            )}

            {isUsingEmbedFallback && videoId && (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}

            {!isUsingEmbedFallback && streamInfo && (
              <>
                <video
                  ref={videoRef}
                  src={
                    streamPort
                      ? buildProxyUrl(streamPort, streamInfo.video_url, 'video/mp4')
                      : streamInfo.video_url
                  }
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                  playsInline
                  onContextMenu={(e) => e.preventDefault()}
                  onError={() => {
                    const err = videoRef.current?.error;
                    const msg =
                      err?.message ||
                      (err?.code ? `Erro ao carregar stream de vídeo (${err.code}).` : 'Erro ao carregar stream de vídeo.');
                    console.warn('[YouTubeWatchModal] Video playback error:', msg);
                    if (videoId) {
                      setIsUsingEmbedFallback(true);
                    } else {
                      setError(msg);
                    }
                  }}
                />
                {streamInfo.audio_url && (
                  <audio
                    ref={audioRef}
                    src={
                      streamPort
                        ? buildProxyUrl(streamPort, streamInfo.audio_url, 'audio/mp4')
                        : streamInfo.audio_url
                    }
                    preload="auto"
                    className="hidden"
                  />
                )}
              </>
            )}
          </div>

          {/* Footer Shortcuts Help Bar */}
          <div className="h-8 px-4 bg-zinc-950 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
            <div className="flex items-center gap-3">
              {isUsingEmbedFallback ? (
                <span><kbd className="font-mono bg-white/[0.05] px-1 py-0.5 rounded text-[10px]">Esc</kbd> Fechar Player</span>
              ) : (
                <>
                  <span><kbd className="font-mono bg-white/[0.05] px-1 py-0.5 rounded text-[10px]">Espaço</kbd> Play/Pause</span>
                  <span><kbd className="font-mono bg-white/[0.05] px-1 py-0.5 rounded text-[10px]">←/→</kbd> ±5s</span>
                  <span><kbd className="font-mono bg-white/[0.05] px-1 py-0.5 rounded text-[10px]">F</kbd> Tela Cheia</span>
                  <span><kbd className="font-mono bg-white/[0.05] px-1 py-0.5 rounded text-[10px]">M</kbd> Mudo</span>
                </>
              )}
            </div>
            <span className="hidden sm:inline text-zinc-600 font-mono text-[10px]">
              {isUsingEmbedFallback
                ? 'Player Oficial YouTube'
                : streamInfo
                ? `Resolução selecionada: ${displayResolution}`
                : ''}
            </span>
          </div>
        </div>
      </div>
    </Portal>
  );
}

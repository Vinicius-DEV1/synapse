import { useState, useEffect, useRef } from 'react';
import { Portal } from '../../ui/Portal';
import { extractYouTubeVideoId } from '../../../services/youtube/youtubeSummaryService';
import { YouTubeWatchModalHeader } from './components/YouTubeWatchModalHeader';
import { YouTubeWatchModalLoading } from './components/YouTubeWatchModalLoading';
import { YouTubeWatchModalError } from './components/YouTubeWatchModalError';
import { useYouTubeStreamLoader } from './hooks/useYouTubeStreamLoader';
import { useYouTubeAudioSync } from './hooks/useYouTubeAudioSync';
import { useYouTubeKeyboardShortcuts } from './hooks/useYouTubeKeyboardShortcuts';
import { useYouTubeStallDetection } from './hooks/useYouTubeStallDetection';

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
  const [isUsingEmbedFallback, setIsUsingEmbedFallback] = useState<boolean>(() => {
    try {
      return localStorage.getItem('caderno_preferred_youtube_player') === 'embed';
    } catch {
      return false;
    }
  });

  const {
    loading,
    error,
    setError,
    streamInfo,
    streamPort,
    loadStream,
    isMountedRef,
  } = useYouTubeStreamLoader({ url, isUsingEmbedFallback });

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const videoId = extractYouTubeVideoId(url);

  // Strict memory teardown when streamInfo or component unmounts or switches to embed
  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;

    const teardown = () => {
      if (video) {
        try {
          video.pause();
          video.removeAttribute('src');
          video.load();
        } catch {
          // Ignore DOM exceptions on teardown
        }
      }
      if (audio) {
        try {
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
        } catch {
          // Ignore DOM exceptions on teardown
        }
      }
    };

    if (isUsingEmbedFallback) {
      teardown();
    }

    return teardown;
  }, [streamInfo, isUsingEmbedFallback]);

  // Smart auto-fallback stall detection
  useYouTubeStallDetection({
    isUsingEmbedFallback,
    streamInfo,
    videoId,
    videoRef,
    isMountedRef,
    onTriggerFallback: setIsUsingEmbedFallback,
  });

  // Audio-video sync for separated DASH streams
  useYouTubeAudioSync({
    videoRef,
    audioRef,
    streamInfo,
    isUsingEmbedFallback,
  });

  // Keyboard navigation
  useYouTubeKeyboardShortcuts({
    isUsingEmbedFallback,
    videoRef,
    containerRef,
    onClose,
  });

  const handleOpenExternal = () => {
    if (window.api?.os?.openInBrowser) {
      window.api.os.openInBrowser(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleTogglePlayerMode = () => {
    setIsUsingEmbedFallback((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('caderno_preferred_youtube_player', next ? 'embed' : 'native');
      } catch {
        // Ignore localStorage errors
      }
      if (!next && !streamInfo) loadStream();
      return next;
    });
  };

  const handleSwitchToEmbed = () => {
    try {
      localStorage.setItem('caderno_preferred_youtube_player', 'embed');
    } catch {
      // Ignore localStorage errors
    }
    setIsUsingEmbedFallback(true);
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
          <YouTubeWatchModalHeader
            displayTitle={displayTitle}
            channel={channel}
            displayResolution={displayResolution}
            isUsingEmbedFallback={isUsingEmbedFallback}
            videoId={videoId}
            onTogglePlayerMode={handleTogglePlayerMode}
            onOpenExternal={handleOpenExternal}
            onClose={onClose}
          />

          {/* Video Player Canvas */}
          <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden">
            {loading && !isUsingEmbedFallback && (
              <YouTubeWatchModalLoading
                videoId={videoId}
                onSwitchToEmbed={handleSwitchToEmbed}
              />
            )}

            {error && !isUsingEmbedFallback && (
              <YouTubeWatchModalError
                error={error}
                videoId={videoId}
                onRetry={loadStream}
                onSwitchToEmbed={handleSwitchToEmbed}
                onOpenExternal={handleOpenExternal}
              />
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
                    onError={() => {
                      console.warn('[YouTubeWatchModal] Audio playback error, falling back to official player');
                      if (videoId) {
                        setIsUsingEmbedFallback(true);
                      }
                    }}
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

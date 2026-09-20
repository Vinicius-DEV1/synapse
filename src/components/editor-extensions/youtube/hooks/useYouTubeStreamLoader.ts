import { useState, useEffect, useCallback, useRef } from 'react';
import type { YouTubeStreamInfo } from '../../../../api/types';

interface UseYouTubeStreamLoaderProps {
  url: string;
  isUsingEmbedFallback: boolean;
}

export function useYouTubeStreamLoader({
  url,
  isUsingEmbedFallback,
}: UseYouTubeStreamLoaderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamInfo, setStreamInfo] = useState<YouTubeStreamInfo | null>(null);
  const [streamPort, setStreamPort] = useState<number | null>(null);
  const isMountedRef = useRef(true);

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
    return () => {
      cancelled = true;
    };
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
    if (!isUsingEmbedFallback) {
      loadStream();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [loadStream, isUsingEmbedFallback]);

  return {
    loading,
    error,
    setError,
    streamInfo,
    streamPort,
    loadStream,
    isMountedRef,
  };
}

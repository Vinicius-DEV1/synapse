import { getVideoId } from '../youtubeUtils';

interface LinkEmbeddedVideoProps {
  url: string;
}

export default function LinkEmbeddedVideo({ url }: LinkEmbeddedVideoProps) {
  const videoId = getVideoId(url);
  if (!videoId) return null;

  // YouTube Error 153 happens when the `origin` param is a non-HTTP URL
  // (e.g. `tauri://localhost` in the Tauri desktop app).
  // Only include origin= for real web contexts (https:// / http://).
  const origin = window.location.protocol.startsWith('http')
    ? `&origin=${encodeURIComponent(window.location.origin)}`
    : '';

  return (
    <div
      className="mt-3 w-full aspect-video rounded-md overflow-hidden bg-black border border-white/10 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0${origin}`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

import { getVideoId } from '../youtubeUtils';

interface LinkEmbeddedVideoProps {
  url: string;
}

export default function LinkEmbeddedVideo({ url }: LinkEmbeddedVideoProps) {
  const videoId = getVideoId(url);
  if (!videoId) return null;

  return (
    <div
      className="mt-3 w-full aspect-video rounded-md overflow-hidden bg-black border border-white/10 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?origin=${encodeURIComponent(
          window.location.origin
        )}`}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

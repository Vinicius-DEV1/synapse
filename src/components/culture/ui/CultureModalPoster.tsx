import type { CultureType } from '../../../types';
import { typeLabel } from '../cards/culture-status';

interface CultureModalPosterProps {
  coverImage?: string;
  title: string;
  type: CultureType;
}

export function CultureModalPoster({ coverImage, title, type }: CultureModalPosterProps) {
  return (
    <div className="w-52 hidden sm:flex flex-shrink-0 relative bg-black/60 flex-col">
      {coverImage ? (
        <img
          src={coverImage}
          alt={title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white/20 text-4xl">📖</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      <div className="absolute bottom-3 left-3">
        <span className="px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
          {typeLabel(type)}
        </span>
      </div>
    </div>
  );
}

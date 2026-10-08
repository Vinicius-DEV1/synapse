import { Star, Globe, Clock, Sparkles } from 'lucide-react';
import type { HydratedRecommendation } from '../../../../types/culture-recommendations';

interface RecommendationMediaSpecsProps {
  item: HydratedRecommendation;
  displaySynopsis: string | null;
}

export function RecommendationMediaSpecs({
  item,
  displaySynopsis,
}: RecommendationMediaSpecsProps) {
  return (
    <>
      {/* Comprehensive Technical & Production Specifications */}
      {(item.platform || item.origin_country || item.duration || item.rating) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
          {item.rating && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Avaliação
              </span>
              <div className="flex items-center gap-1 font-semibold text-amber-300">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span>{item.rating.toFixed(1)} / 10</span>
                {item.rating_source && (
                  <span className="text-[10px] text-zinc-400 font-normal">
                    ({item.rating_source})
                  </span>
                )}
              </div>
            </div>
          )}

          {item.platform && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Onde Exibido / Origem
              </span>
              <span className="font-medium text-zinc-200 truncate" title={item.platform}>
                {item.platform}
              </span>
            </div>
          )}

          {item.origin_country && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                País de Origem
              </span>
              <div className="flex items-center gap-1 text-zinc-200 font-medium">
                <Globe size={11} className="text-zinc-400 flex-shrink-0" />
                <span className="truncate" title={item.origin_country}>
                  {item.origin_country}
                </span>
              </div>
            </div>
          )}

          {item.duration && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                Duração / Extensão
              </span>
              <div className="flex items-center gap-1 text-zinc-200 font-medium">
                <Clock size={11} className="text-zinc-400 flex-shrink-0" />
                <span className="truncate" title={item.duration}>
                  {item.duration}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Affinity Rationale Card */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-zinc-900 to-purple-500/10 border border-amber-500/20 shadow-sm space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 tracking-wide uppercase">
          <Sparkles size={13} className="text-amber-400" />
          <span>Por Que Recomendamos Para Você</span>
        </div>
        <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-normal">
          {item.affinity_reason}
        </p>
      </div>

      {/* Synopsis */}
      {displaySynopsis && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Sinopse
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed bg-white/[0.02] p-3.5 rounded-xl border border-white/5 whitespace-pre-line">
            {displaySynopsis}
          </p>
        </div>
      )}

      {/* Genres Tag Cloud */}
      {item.genres && item.genres.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Gêneros
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {item.genres.map((genre) => (
              <span
                key={genre}
                className="px-2.5 py-0.5 rounded-md text-xs bg-white/5 border border-white/10 text-zinc-300"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

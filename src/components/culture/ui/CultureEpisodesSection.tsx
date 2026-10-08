import { Play } from 'lucide-react';
import type { CultureEpisode } from '../../../types';

interface CultureEpisodesSectionProps {
  hasEpisodesFeature: boolean;
  apiId?: string;
  itemType: string;
  loadingEpisodes: boolean;
  showEpisodes: boolean;
  episodes: CultureEpisode[];
  onToggleEpisodes: () => void;
}

export function CultureEpisodesSection({
  hasEpisodesFeature,
  apiId,
  itemType,
  loadingEpisodes,
  showEpisodes,
  episodes,
  onToggleEpisodes,
}: CultureEpisodesSectionProps) {
  if (!hasEpisodesFeature || !apiId) return null;

  const isTextMedium = itemType === 'manga' || itemType === 'hq' || itemType === 'novel';

  return (
    <div className="space-y-2">
      <button
        onClick={onToggleEpisodes}
        disabled={loadingEpisodes}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 hover:border-brand-500/40 rounded-xl text-sm font-semibold text-brand-400 transition-all duration-200 disabled:opacity-50"
      >
        <Play size={15} className={loadingEpisodes ? 'animate-pulse' : ''} />
        {loadingEpisodes
          ? 'Carregando...'
          : showEpisodes
          ? 'Ocultar lista'
          : isTextMedium
          ? `Ver Capítulos ${episodes.length > 0 ? `(${episodes.length})` : ''}`
          : `Ver Episódios ${episodes.length > 0 ? `(${episodes.length})` : ''}`}
      </button>

      {showEpisodes && episodes.length > 0 && (
        <div className="max-h-48 overflow-y-auto scrollbar-custom space-y-1 p-2 rounded-xl bg-black/30 border border-white/5">
          {episodes.map((ep) => (
            <div
              key={ep.id}
              className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                ep.is_watched ? 'text-white/40 bg-white/[0.02]' : 'text-white/80 bg-white/[0.04]'
              }`}
            >
              <span className="truncate flex-1 pr-2">
                {ep.episode_number ? `Ep. ${ep.episode_number}: ` : ''}
                {ep.title}
              </span>
              {ep.is_watched && (
                <span className="text-[10px] text-emerald-400 font-semibold flex-shrink-0">Visto</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

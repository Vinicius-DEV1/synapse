import React, { useState } from 'react';
import { ChevronDown, CheckCheck, Minus } from 'lucide-react';
import type { CultureEpisode } from '../../../types';
import { EpisodeRow, type EnrichedEpisode } from './EpisodeRow';

interface SeasonSectionProps {
  seasonNum: number;
  episodes: EnrichedEpisode[];
  defaultOpen: boolean;
  onToggleWatched: (ep: CultureEpisode) => void;
  onMarkAll: (episodes: EnrichedEpisode[], watched: boolean) => void;
}

export const SeasonSection = React.memo(
  ({ seasonNum, episodes, defaultOpen, onToggleWatched, onMarkAll }: SeasonSectionProps) => {
    const [open, setOpen] = useState(defaultOpen);
    const watched = episodes.filter((e) => e.is_watched).length;
    const total = episodes.length;
    const pct = total > 0 ? Math.round((watched / total) * 100) : 0;
    const allDone = watched === total;

    return (
      <div className="mb-2">
        <div className="flex items-center gap-1">
          {/* Collapse toggle */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors group text-left"
          >
            <span
              className={`flex-shrink-0 transition-transform duration-200 text-white/40 group-hover:text-white/70 ${
                open ? '' : '-rotate-90'
              }`}
            >
              <ChevronDown size={16} />
            </span>
            <span className="font-semibold text-sm text-white/80">Temporada {seasonNum}</span>
            <span className="text-xs text-white/30">
              {watched}/{total}
            </span>
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden mx-2">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  allDone ? 'bg-green-500/70' : 'bg-brand-500/70'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-white/30 w-8 text-right">{pct}%</span>
          </button>

          {/* Mark all / unmark all */}
          <button
            onClick={() => onMarkAll(episodes, !allDone)}
            title={allDone ? 'Desmarcar temporada' : 'Marcar temporada como assistida'}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-colors mr-1 ${
              allDone
                ? 'text-green-400/60 hover:text-white/60 hover:bg-white/5'
                : 'text-white/30 hover:text-green-400 hover:bg-green-500/10'
            }`}
          >
            {allDone ? <Minus size={14} /> : <CheckCheck size={14} />}
          </button>
        </div>

        {open && (
          <div className="ml-2 mt-1 grid gap-1">
            {episodes.map((ep) => (
              <EpisodeRow key={ep.id} ep={ep} onToggle={onToggleWatched} />
            ))}
          </div>
        )}
      </div>
    );
  }
);

SeasonSection.displayName = 'SeasonSection';

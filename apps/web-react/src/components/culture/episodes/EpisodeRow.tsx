import React from 'react';
import { Check, Eye, EyeOff, CalendarClock } from 'lucide-react';
import type { CultureEpisode } from '../../../types';

export interface EnrichedEpisode extends CultureEpisode {
  _season: number | null;
  _epInSeason: number | null;
  _isFuture: boolean;
}

export function formatAiredDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function isFuture(iso?: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) > new Date();
}

export function parseSeasonFromTitle(title: string): { season: number; epInSeason: number } | null {
  const m = title.match(/^S(\d+)E(\d+)/i);
  return m ? { season: parseInt(m[1], 10), epInSeason: parseInt(m[2], 10) } : null;
}

export function enrichEpisodes(episodes: CultureEpisode[], hasTvMaze: boolean): EnrichedEpisode[] {
  return episodes.map(ep => {
    let season: number | null = ep.season_number ?? null;
    let epInSeason: number | null = ep.episode_in_season ?? null;
    if (hasTvMaze && season === null) {
      const p = parseSeasonFromTitle(ep.title);
      if (p) {
        season = p.season;
        epInSeason = p.epInSeason;
      }
    }
    return { ...ep, _season: season, _epInSeason: epInSeason, _isFuture: isFuture(ep.aired_at) };
  });
}

interface EpisodeRowProps {
  ep: EnrichedEpisode;
  onToggle: (ep: CultureEpisode) => void;
  readonly?: boolean;
}

export const EpisodeRow = React.memo(({ ep, onToggle, readonly }: EpisodeRowProps) => {
  return (
    <div
      onClick={() => !readonly && onToggle(ep)}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
        readonly
          ? 'bg-amber-500/5 border-amber-500/20 cursor-default'
          : ep.is_watched
          ? 'bg-brand-500/5 border-brand-500/20 cursor-pointer hover:bg-brand-500/10'
          : 'bg-white/3 border-white/5 cursor-pointer hover:bg-white/8'
      }`}
    >
      {/* Checkbox */}
      {!readonly && (
        <div
          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
            ep.is_watched
              ? 'bg-brand-500 text-white'
              : 'bg-black/40 border border-white/20 text-transparent hover:border-white/40'
          }`}
        >
          <Check size={12} />
        </div>
      )}

      {/* Ep number */}
      <div className="flex-shrink-0 min-w-[2.5rem]">
        {ep._epInSeason != null ? (
          <span className="text-[10px] font-mono text-white/30">
            E{String(ep._epInSeason).padStart(2, '0')}
          </span>
        ) : (
          <span className="text-[10px] font-mono text-white/30">
            #{String(ep.episode_number).padStart(3, '0')}
          </span>
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h4
          className={`text-sm font-medium truncate leading-tight ${
            ep.is_watched ? 'text-white/50' : readonly ? 'text-amber-200/80' : 'text-white'
          }`}
        >
          {ep._season != null ? ep.title.replace(/^S\d+E\d+\s*-\s*/i, '') : ep.title}
        </h4>
        {ep.synopsis && <p className="text-[11px] text-white/30 mt-0.5 line-clamp-1">{ep.synopsis}</p>}
      </div>

      {/* Date + eye */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1 ml-2">
        {ep._isFuture ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
            <CalendarClock size={10} />
            {ep.aired_at ? formatAiredDate(ep.aired_at) : 'Em breve'}
          </span>
        ) : ep.aired_at ? (
          <span className="text-[10px] text-white/20">{formatAiredDate(ep.aired_at)}</span>
        ) : null}
        {!readonly && (
          <div className="text-white/20">{ep.is_watched ? <Eye size={14} /> : <EyeOff size={14} />}</div>
        )}
      </div>
    </div>
  );
});

EpisodeRow.displayName = 'EpisodeRow';

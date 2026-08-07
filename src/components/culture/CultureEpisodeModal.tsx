import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Check, RefreshCw, AlertCircle, PlayCircle, Eye, EyeOff,
  ChevronDown, ChevronRight, CalendarClock, Search, CheckCheck, Minus
} from 'lucide-react';
import type { CultureItem, CultureEpisode } from '../../types';
import { CultureService } from '../../services/culture';
import { Portal } from '../ui/Portal';

interface CultureEpisodeModalProps {
  item: CultureItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProgress: (progress: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAiredDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch { return ''; }
}

function isFuture(iso?: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) > new Date();
}

function parseSeasonFromTitle(title: string): { season: number; epInSeason: number } | null {
  const m = title.match(/^S(\d+)E(\d+)/i);
  return m ? { season: parseInt(m[1], 10), epInSeason: parseInt(m[2], 10) } : null;
}

interface EnrichedEpisode extends CultureEpisode {
  _season: number | null;
  _epInSeason: number | null;
  _isFuture: boolean;
}

function enrichEpisodes(episodes: CultureEpisode[], hasTvMaze: boolean): EnrichedEpisode[] {
  return episodes.map(ep => {
    let season: number | null = ep.season_number ?? null;
    let epInSeason: number | null = ep.episode_in_season ?? null;
    if (hasTvMaze && season === null) {
      const p = parseSeasonFromTitle(ep.title);
      if (p) { season = p.season; epInSeason = p.epInSeason; }
    }
    return { ...ep, _season: season, _epInSeason: epInSeason, _isFuture: isFuture(ep.aired_at) };
  });
}

// ── SeasonSection ─────────────────────────────────────────────────────────────
interface SeasonSectionProps {
  seasonNum: number;
  episodes: EnrichedEpisode[];
  defaultOpen: boolean;
  onToggleWatched: (ep: CultureEpisode) => void;
  onMarkAll: (episodes: EnrichedEpisode[], watched: boolean) => void;
}

const SeasonSection = React.memo(({ seasonNum, episodes, defaultOpen, onToggleWatched, onMarkAll }: SeasonSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const watched = episodes.filter(e => e.is_watched).length;
  const total = episodes.length;
  const pct = total > 0 ? Math.round((watched / total) * 100) : 0;
  const allDone = watched === total;
  const noneDone = watched === 0;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-1">
        {/* Collapse toggle */}
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors group text-left"
        >
          <span className={`flex-shrink-0 transition-transform duration-200 text-white/40 group-hover:text-white/70 ${open ? '' : '-rotate-90'}`}>
            <ChevronDown size={16} />
          </span>
          <span className="font-semibold text-sm text-white/80">Temporada {seasonNum}</span>
          <span className="text-xs text-white/30">{watched}/{total}</span>
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden mx-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-green-500/70' : 'bg-brand-500/70'}`}
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
          {episodes.map(ep => (
            <EpisodeRow key={ep.id} ep={ep} onToggle={onToggleWatched} />
          ))}
        </div>
      )}
    </div>
  );
});
SeasonSection.displayName = 'SeasonSection';

// ── EpisodeRow ────────────────────────────────────────────────────────────────
const EpisodeRow = React.memo(({ ep, onToggle, readonly }: {
  ep: EnrichedEpisode;
  onToggle: (ep: CultureEpisode) => void;
  readonly?: boolean;
}) => {
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
        <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
          ep.is_watched ? 'bg-brand-500 text-white' : 'bg-black/40 border border-white/20 text-transparent hover:border-white/40'
        }`}>
          <Check size={12} />
        </div>
      )}

      {/* Ep number */}
      <div className="flex-shrink-0 min-w-[2.5rem]">
        {ep._epInSeason != null
          ? <span className="text-[10px] font-mono text-white/30">E{String(ep._epInSeason).padStart(2, '0')}</span>
          : <span className="text-[10px] font-mono text-white/30">#{String(ep.episode_number).padStart(3, '0')}</span>
        }
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-medium truncate leading-tight ${ep.is_watched ? 'text-white/50' : readonly ? 'text-amber-200/80' : 'text-white'}`}>
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

// ── Main Modal ────────────────────────────────────────────────────────────────
export function CultureEpisodeModal({ item, isOpen, onClose, onUpdateProgress }: CultureEpisodeModalProps) {
  const [episodes, setEpisodes] = useState<CultureEpisode[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showFuture, setShowFuture] = useState(true);
  const [epSearch, setEpSearch] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (isOpen) { loadEpisodes(); setEpSearch(''); }
    return () => { isMounted.current = false; };
  }, [isOpen, item.id]);

  const loadEpisodes = async () => {
    try {
      const eps = await CultureService.getEpisodes(item.id);
      setEpisodes(eps);
      if (eps.length === 0 && item.api_id && item.api_source) startBackgroundSync();
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar episódios locais.');
    }
  };

  const startBackgroundSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setError(null);
    setSyncProgress(0);

    try {
      if (item.api_source === 'tvmaze') {
        const res = await fetch(`https://api.tvmaze.com/shows/${item.api_id}/episodes`);
        if (!res.ok) throw new Error('Falha ao buscar dados do TVMaze');
        const data = await res.json();
        const epsToSave = data.map((ep: any) => ({
          id: `ep_${item.id}_${ep.id}`,
          episode_number: ep.id,
          season_number: ep.season,
          episode_in_season: ep.number,
          title: `S${String(ep.season).padStart(2, '0')}E${String(ep.number).padStart(2, '0')} - ${ep.name}`,
          synopsis: (ep.summary || '').replace(/<[^>]+>/g, ''),
          is_watched: false,
          aired_at: ep.airstamp ? new Date(ep.airstamp).toISOString() : null,
        }));
        await CultureService.saveEpisodes(item.id, epsToSave);
        await window.api.culture.updateItem(item.id, { ...item, last_sync_at: new Date().toISOString() });
        if (isMounted.current) await loadEpisodes();

      } else if (item.api_source === 'jikan') {
        let page = 1;
        let hasNextPage = true;
        while (hasNextPage && isMounted.current) {
          const res = await fetch(`https://api.jikan.moe/v4/anime/${item.api_id}/episodes?page=${page}`);
          if (!res.ok) {
            if (res.status === 429) { await new Promise(r => setTimeout(r, 1000)); continue; }
            throw new Error('Falha ao buscar dados do Jikan');
          }
          const data = await res.json();
          const epList = data.data || [];
          if (epList.length === 0) break;
          const epsToSave = epList.map((ep: any) => ({
            id: `ep_${item.id}_${ep.mal_id}`,
            episode_number: ep.mal_id,
            title: ep.title || `Episódio ${ep.mal_id}`,
            synopsis: ep.title_japanese ? `JP: ${ep.title_japanese}` : '',
            is_watched: false,
            aired_at: ep.aired ? new Date(ep.aired).toISOString() : null,
          }));
          await CultureService.saveEpisodes(item.id, epsToSave);
          if (!data.pagination?.has_next_page) {
            await window.api.culture.updateItem(item.id, { ...item, last_sync_at: new Date().toISOString() });
          }
          setSyncProgress(prev => prev + epList.length);
          if (isMounted.current) {
            const current = await CultureService.getEpisodes(item.id);
            setEpisodes(current);
          }
          hasNextPage = data.pagination?.has_next_page || false;
          page++;
          await new Promise(r => setTimeout(r, 400));
        }
      }
    } catch (err: any) {
      console.error('Erro na sincronização:', err);
      if (isMounted.current) setError('Falha ao sincronizar episódios. Tente novamente.');
    } finally {
      if (isMounted.current) setIsSyncing(false);
    }
  };

  const toggleWatched = async (ep: CultureEpisode) => {
    try {
      const newState = !ep.is_watched;
      await CultureService.toggleEpisodeWatched(ep.id, newState);
      setEpisodes(prev => prev.map(e => e.id === ep.id ? { ...e, is_watched: newState } : e));
      const count = episodes.filter(e => e.id !== ep.id ? e.is_watched : newState).length;
      onUpdateProgress(count);
    } catch (err) { console.error('Erro ao marcar episódio', err); }
  };

  const markSeasonAll = async (eps: EnrichedEpisode[], watched: boolean) => {
    try {
      await Promise.all(eps.map(ep => CultureService.toggleEpisodeWatched(ep.id, watched)));
      const idsSet = new Set(eps.map(e => e.id));
      setEpisodes(prev => prev.map(e => idsSet.has(e.id) ? { ...e, is_watched: watched } : e));
      const count = episodes.filter(e => idsSet.has(e.id) ? watched : e.is_watched).length;
      onUpdateProgress(count);
    } catch (err) { console.error('Erro ao marcar temporada', err); }
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const isTvMaze = item.api_source === 'tvmaze';
  const enriched = useMemo(() => enrichEpisodes(episodes, isTvMaze), [episodes, isTvMaze]);

  const futureEpisodes = useMemo(() => enriched.filter(e => e._isFuture), [enriched]);
  const pastEpisodes   = useMemo(() => enriched.filter(e => !e._isFuture), [enriched]);

  const hasSeasonsData = useMemo(() => pastEpisodes.some(e => e._season != null), [pastEpisodes]);

  const seasonGroups = useMemo(() => {
    if (!hasSeasonsData) return null;
    const map = new Map<number, EnrichedEpisode[]>();
    for (const ep of pastEpisodes) {
      const s = ep._season ?? 0;
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(ep);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([season, eps]) => ({
        season,
        episodes: eps.sort((a, b) => (a._epInSeason ?? a.episode_number) - (b._epInSeason ?? b.episode_number)),
      }));
  }, [pastEpisodes, hasSeasonsData]);

  // Season in progress = first season with unwatched eps
  const currentSeasonNum = useMemo(() => {
    if (!seasonGroups) return null;
    for (const g of seasonGroups) {
      if (g.episodes.some(e => !e.is_watched)) return g.season;
    }
    return seasonGroups[seasonGroups.length - 1]?.season ?? null;
  }, [seasonGroups]);

  // Next unwatched episode
  const nextEpisode = useMemo(() => pastEpisodes.find(e => !e.is_watched) ?? null, [pastEpisodes]);

  // Episode search
  const searchedEpisodes = useMemo(() => {
    const q = epSearch.trim().toLowerCase();
    if (!q) return null;
    return enriched.filter(e =>
      e.title.toLowerCase().includes(q) ||
      String(e.episode_number).includes(q) ||
      (e._epInSeason != null && String(e._epInSeason).includes(q))
    );
  }, [enriched, epSearch]);

  const watchedCount = episodes.filter(e => e.is_watched).length;
  const canResync = !!item.api_id && !!item.api_source;

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-dark-card w-full max-w-3xl rounded-3xl shadow-2xl border border-white/10 flex flex-col h-[85vh] overflow-hidden">

        {/* ── Header ── */}
        <div className="relative p-6 overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-brand-500/10 backdrop-blur-3xl" />
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl" />
          <div className="relative flex justify-between items-start">
            <div className="flex gap-4 items-center">
              {item.cover_image && (
                <img src={item.cover_image} alt="cover" className="w-16 h-24 object-cover rounded-xl shadow-lg ring-1 ring-white/10" />
              )}
              <div>
                <h2 className="text-2xl font-bold text-white drop-shadow-md">{item.title}</h2>
                <p className="text-white/60 text-sm mt-1">
                  {episodes.length > 0 ? `${episodes.length} episódios` : 'Carregando...'}
                  {futureEpisodes.length > 0 && <span className="ml-2 text-amber-400/80">• {futureEpisodes.length} em breve</span>}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 w-48 h-1.5 bg-black/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 transition-all duration-500"
                      style={{ width: `${episodes.length > 0 ? (watchedCount / episodes.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-brand-400">{watchedCount} de {episodes.length || '?'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Re-sync button */}
              {canResync && (
                <button
                  onClick={startBackgroundSync}
                  disabled={isSyncing}
                  title="Sincronizar episódios novamente"
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white disabled:opacity-30 backdrop-blur-md bg-black/20"
                >
                  <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white backdrop-blur-md bg-black/20">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Next Episode Banner ── */}
        {nextEpisode && !epSearch && (
          <div className="bg-brand-500/10 border-b border-brand-500/20 px-5 py-2.5 flex items-center gap-3 flex-shrink-0">
            <PlayCircle size={15} className="text-brand-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-brand-300 font-semibold">Próximo: </span>
              <span className="text-xs text-white/70 truncate">
                {nextEpisode._season != null
                  ? `T${nextEpisode._season} E${nextEpisode._epInSeason ?? nextEpisode.episode_number} — ${nextEpisode.title.replace(/^S\d+E\d+\s*-\s*/i, '')}`
                  : `Ep ${nextEpisode.episode_number} — ${nextEpisode.title}`
                }
              </span>
            </div>
            <button
              onClick={() => toggleWatched(nextEpisode)}
              className="flex-shrink-0 text-xs px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium active:scale-95"
            >
              Marcar assistido
            </button>
          </div>
        )}

        {/* ── Sync / Error banners ── */}
        {isSyncing && (
          <div className="bg-brand-500/10 border-b border-brand-500/20 px-6 py-2 flex items-center gap-3 animate-pulse flex-shrink-0">
            <RefreshCw size={14} className="text-brand-400 animate-spin" />
            <span className="text-xs text-brand-300">
              Sincronizando episódios...{syncProgress > 0 && ` (${syncProgress} carregados)`}
            </span>
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2 flex items-center gap-3 flex-shrink-0">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-xs text-red-300">{error}</span>
            {canResync && (
              <button onClick={startBackgroundSync} className="ml-auto text-xs text-red-300 hover:text-red-200 underline">Tentar novamente</button>
            )}
          </div>
        )}

        {/* ── Search bar ── */}
        {episodes.length > 0 && (
          <div className="px-4 pt-3 pb-0 flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={epSearch}
                onChange={e => setEpSearch(e.target.value)}
                placeholder="Buscar episódio por título ou número..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-500/40 transition-colors"
              />
              {epSearch && (
                <button onClick={() => setEpSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Episode List ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-black/20">
          {episodes.length === 0 && !isSyncing ? (
            <div className="h-full flex flex-col items-center justify-center text-white/30 gap-4">
              <PlayCircle size={48} className="opacity-20" />
              <p>Nenhum episódio disponível para esta obra.</p>
              {!item.api_id && <p className="text-xs text-white/20 max-w-sm text-center">Esta obra foi adicionada sem API vinculada.</p>}
              {canResync && (
                <button onClick={startBackgroundSync} className="px-4 py-2 mt-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors text-sm font-medium">
                  Sincronizar Episódios
                </button>
              )}
            </div>
          ) : searchedEpisodes !== null ? (
            // ── Search results (flat) ──
            <div className="grid gap-1.5">
              {searchedEpisodes.length === 0 ? (
                <div className="text-center text-white/30 text-sm py-12">Nenhum episódio encontrado.</div>
              ) : searchedEpisodes.map(ep => (
                <EpisodeRow key={ep.id} ep={ep} onToggle={toggleWatched} readonly={ep._isFuture} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* ── Próximos episódios (futuros) ── */}
              {futureEpisodes.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setShowFuture(v => !v)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-amber-500/5 transition-colors"
                  >
                    <CalendarClock size={15} className="text-amber-400" />
                    <span className="font-semibold text-sm text-amber-300">Próximos Episódios</span>
                    <span className="text-xs text-amber-400/60 bg-amber-500/10 px-2 py-0.5 rounded-full">{futureEpisodes.length}</span>
                    <div className="flex-1" />
                    {showFuture ? <ChevronDown size={14} className="text-amber-400/60" /> : <ChevronRight size={14} className="text-amber-400/60" />}
                  </button>
                  {showFuture && (
                    <div className="px-4 pb-4 grid gap-1.5">
                      {futureEpisodes.map(ep => <EpisodeRow key={ep.id} ep={ep} onToggle={toggleWatched} readonly />)}
                    </div>
                  )}
                </div>
              )}

              {/* ── Episódios passados ── */}
              {hasSeasonsData && seasonGroups ? (
                <div>
                  {seasonGroups.map(({ season, episodes: eps }) => (
                    <SeasonSection
                      key={season}
                      seasonNum={season}
                      episodes={eps}
                      defaultOpen={season === currentSeasonNum}
                      onToggleWatched={toggleWatched}
                      onMarkAll={markSeasonAll}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid gap-1.5">
                  {pastEpisodes.map(ep => <EpisodeRow key={ep.id} ep={ep} onToggle={toggleWatched} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}

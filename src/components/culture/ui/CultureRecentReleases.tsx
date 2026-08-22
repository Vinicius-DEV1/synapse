import { Calendar } from 'lucide-react';
import type { CultureItem, EnrichedEpisode } from '../../../types';
import { formatDayMonth } from '../../../utils/date-utils';

interface CultureRecentReleasesProps {
  recentReleases: EnrichedEpisode[];
  items: CultureItem[];
  onSelectItem: (item: CultureItem) => void;
}

export function CultureRecentReleases({
  recentReleases,
  items,
  onSelectItem,
}: CultureRecentReleasesProps) {
  if (recentReleases.length === 0) return null;

  return (
    <div className="mx-6 mt-5 bg-brand-500/10 border border-brand-500/20 rounded-2xl p-4 flex flex-col gap-3 animate-fade-in flex-shrink-0">
      <div className="flex items-center gap-2 text-brand-400 font-semibold text-sm">
        <Calendar size={16} />
        <span>Lançamentos da Semana</span>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-custom pb-2">
        {recentReleases.map(ep => (
          <div
            key={ep.id}
            onClick={() => {
              const it = items.find(i => i.id === ep.item_id);
              if (it) onSelectItem(it);
            }}
            className="flex-shrink-0 w-64 bg-black/20 rounded-xl p-3 border border-white/5 flex gap-3 items-center hover:bg-white/5 transition-colors cursor-pointer"
          >
            {ep.item_cover && <img src={ep.item_cover} alt="cover" className="w-10 h-14 object-cover rounded shadow" />}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-white truncate">{ep.item_title}</div>
              <div className="text-xs text-white/50 truncate">EP {ep.episode_number}: {ep.title}</div>
              <div className="text-[10px] text-brand-400 mt-1">{formatDayMonth(ep.aired_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

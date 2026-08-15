import React from 'react';
import { MessageSquare } from 'lucide-react';

export interface SubtitleOption {
  lang: string;
  name: string;
  isAuto: boolean;
}

interface YouTubeSubtitleSelectorProps {
  availableSubs: SubtitleOption[];
  selectedSubs: string[];
  subSearch: string;
  setSubSearch: (s: string) => void;
  onToggleSub: (lang: string) => void;
}

export function YouTubeSubtitleSelector({
  availableSubs,
  selectedSubs,
  subSearch,
  setSubSearch,
  onToggleSub,
}: YouTubeSubtitleSelectorProps) {
  if (availableSubs.length === 0) return null;

  const filtered = availableSubs.filter(
    sub =>
      sub.lang.toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.name.toLowerCase().includes(subSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-white/70 flex items-center gap-2">
          <MessageSquare size={14} className="text-brand-400" />
          Legendas para Embutir
        </label>
        <input
          type="text"
          placeholder="Buscar idioma..."
          value={subSearch}
          onChange={(e) => setSubSearch(e.target.value)}
          className="bg-black/20 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-brand-500 w-32"
        />
      </div>
      <div className="max-h-[120px] overflow-y-auto bg-black/20 border border-white/10 rounded-lg p-2 flex flex-col gap-1">
        {filtered.map(sub => (
          <label key={sub.lang} className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-md cursor-pointer transition-colors group">
            <input
              type="checkbox"
              checked={selectedSubs.includes(sub.lang)}
              onChange={() => onToggleSub(sub.lang)}
              className="w-3.5 h-3.5 accent-brand-500 bg-black/30 border-white/20 rounded-sm cursor-pointer"
            />
            <span className="text-sm text-white group-hover:text-brand-300 transition-colors flex-1 flex items-center justify-between">
              {sub.name.toUpperCase()} ({sub.lang})
              {sub.isAuto && (
                <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded uppercase font-medium ml-2">Auto</span>
              )}
            </span>
          </label>
        ))}
        {filtered.length === 0 && (
          <span className="text-xs text-dark-subtext p-2 text-center">Nenhuma legenda encontrada.</span>
        )}
      </div>
    </div>
  );
}

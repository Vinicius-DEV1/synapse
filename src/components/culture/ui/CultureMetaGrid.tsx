import React from 'react';
import { Tv, BookOpen, Layers, Hash, Globe, Calendar, Clock } from 'lucide-react';
import type { CultureItem } from '../../../types';

interface CultureMetaGridProps {
  item: CultureItem;
}

export function CultureMetaGrid({ item }: CultureMetaGridProps) {
  const metaCards: { icon: React.ReactNode; label: string; value: string; color?: string }[] = [];

  if (item.episodes_count) {
    metaCards.push({ icon: <Tv size={15} />, label: 'Episódios', value: String(item.episodes_count), color: 'text-blue-400' });
  }
  if (item.chapters) {
    metaCards.push({ icon: <BookOpen size={15} />, label: 'Capítulos', value: String(item.chapters), color: 'text-purple-400' });
  }
  if (item.volumes) {
    metaCards.push({ icon: <Layers size={15} />, label: 'Volumes', value: String(item.volumes), color: 'text-orange-400' });
  }
  if (item.total_progress > 0) {
    metaCards.push({ icon: <Hash size={15} />, label: 'Total', value: String(item.total_progress), color: 'text-brand-400' });
  }
  if (item.api_source) {
    const sourceLabels: Record<string, string> = { jikan: 'MyAnimeList', books: 'Google Books', tvmaze: 'TVmaze', itunes: 'iTunes' };
    metaCards.push({ icon: <Globe size={15} />, label: 'Fonte', value: sourceLabels[item.api_source] || item.api_source, color: 'text-green-400' });
  }
  if (item.created_at) {
    metaCards.push({ icon: <Calendar size={15} />, label: 'Adicionado', value: new Date(item.created_at).toLocaleDateString('pt-BR'), color: 'text-white/50' });
  }
  if (item.last_sync_at) {
    metaCards.push({ icon: <Clock size={15} />, label: 'Últ. sync', value: new Date(item.last_sync_at).toLocaleDateString('pt-BR'), color: 'text-white/50' });
  }

  if (metaCards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {metaCards.map((c, i) => (
        <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
          <span className={c.color || 'text-white/50'}>{c.icon}</span>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-white/40 block leading-tight">{c.label}</span>
            <span className="text-xs font-semibold text-white truncate block mt-0.5">{c.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

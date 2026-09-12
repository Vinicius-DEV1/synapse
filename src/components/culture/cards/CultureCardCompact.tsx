import React from 'react';
import { Target, Plus, CheckCircle, Image as ImageIcon, List } from 'lucide-react';
import type { CultureItem } from '../../../types';
import type { CultureStatusInfo } from './culture-status';

interface CultureCardCompactProps {
  item: CultureItem;
  percent: number;
  isFinished: boolean;
  hasEpisodes: boolean;
  hasNewRelease?: boolean;
  statusInfo: CultureStatusInfo | null;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onOpenEpisodes: (e: React.MouseEvent) => void;
  onIncrement: (e: React.MouseEvent) => void;
}

export function CultureCardCompact({
  item,
  percent,
  isFinished,
  hasEpisodes,
  hasNewRelease,
  statusInfo,
  onClick,
  onContextMenu,
  onOpenEpisodes,
  onIncrement
}: CultureCardCompactProps) {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`group relative overflow-hidden rounded-lg cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-lg ${
        item.is_goal ? 'ring-2 ring-brand-500/60' : 'ring-1 ring-white/5'
      } bg-white/5`}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-dark-bg/50">
        {item.cover_image
          ? <img
              src={item.cover_image}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={18} className="opacity-40 text-dark-subtext" /></div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {hasNewRelease && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-lg shadow-red-500/50 animate-pulse" />}
        {item.is_goal && (
          <div className="absolute top-1 left-1 p-0.5 rounded bg-brand-500/80" title={item.goal_note || 'Objetivo'}>
            <Target size={9} className="text-white" />
          </div>
        )}
        {statusInfo && (
          <div className={`absolute bottom-2 left-1.5 w-1.5 h-1.5 rounded-full ${statusInfo.dot} shadow`} title={statusInfo.label} />
        )}

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40">
          <div
            className={`h-full transition-all duration-500 ${item.is_goal ? 'bg-brand-400' : 'bg-brand-500/80'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="px-1.5 py-1.5">
        <h3 className="text-[10px] font-medium text-dark-text leading-tight line-clamp-2" title={item.title}>
          {item.title}
        </h3>
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        {hasEpisodes ? (
          <button onClick={onOpenEpisodes} className="p-2 bg-brand-500 rounded-full shadow-lg text-white"><List size={14} /></button>
        ) : (
          <button onClick={onIncrement} disabled={isFinished} className="p-2 bg-white/20 rounded-full text-white disabled:opacity-50">
            {isFinished ? <CheckCircle size={14} className="text-green-400" /> : <Plus size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

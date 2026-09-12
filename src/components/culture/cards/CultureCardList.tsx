import React from 'react';
import { Target, Plus, CheckCircle, ExternalLink, Image as ImageIcon, List } from 'lucide-react';
import type { CultureItem } from '../../../types';
import type { CultureStatusInfo } from './culture-status';

interface CultureCardListProps {
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
  onOpenLink: (e: React.MouseEvent) => void;
}

export function CultureCardList({
  item,
  percent,
  isFinished,
  hasEpisodes,
  hasNewRelease,
  statusInfo,
  onClick,
  onContextMenu,
  onOpenEpisodes,
  onIncrement,
  onOpenLink
}: CultureCardListProps) {
  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/5 ${
        item.is_goal ? 'border border-brand-500/30 bg-brand-500/5' : 'border border-transparent'
      }`}
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-8 h-12 rounded-md overflow-hidden bg-white/5">
        {item.cover_image
          ? <img
              src={item.cover_image}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={14} className="opacity-40 text-dark-subtext" /></div>
        }
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {hasNewRelease && <span className="flex-shrink-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
          {item.is_goal && (
            <span className="flex-shrink-0" title={item.goal_note || 'Objetivo'}>
              <Target size={11} className="text-brand-400" />
            </span>
          )}
          <span className="text-sm font-medium text-dark-text truncate">{item.title}</span>
        </div>
        {item.is_goal && item.goal_note && (
          <div className="mt-0.5 text-[11px] text-brand-300/80 truncate">
            <span className="font-medium text-brand-400/80">Meta: </span>{item.goal_note}
          </div>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-dark-subtext uppercase tracking-wider">{item.type}</span>
          {statusInfo && (
            <span className={`flex items-center gap-1 text-[9px] font-medium ${statusInfo.text}`}>
              <span className={`w-1 h-1 rounded-full ${statusInfo.dot}`} />
              {statusInfo.label}
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="flex-shrink-0 flex items-center gap-3 w-40">
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${item.is_goal ? 'bg-brand-400' : 'bg-brand-500/70'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-[10px] text-dark-subtext w-12 text-right tabular-nums">
          {item.total_progress > 0 ? `${item.progress}/${item.total_progress}` : `${item.progress}`}
        </span>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {hasEpisodes ? (
          <button onClick={onOpenEpisodes} className="p-1.5 rounded-lg bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 transition-colors" title="Ver episódios">
            <List size={13} />
          </button>
        ) : (
          <button onClick={onIncrement} disabled={isFinished} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-dark-text disabled:opacity-40 transition-colors">
            {isFinished ? <CheckCircle size={13} className="text-green-400" /> : <Plus size={13} />}
          </button>
        )}
        {item.access_link && (
          <button onClick={onOpenLink} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-dark-subtext transition-colors">
            <ExternalLink size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

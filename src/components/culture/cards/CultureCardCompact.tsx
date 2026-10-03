import React from 'react';
import { Target, Plus, CheckCircle, Image as ImageIcon, List, Pencil } from 'lucide-react';
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
  onFinish?: (e: React.MouseEvent) => void;
  onEdit?: () => void;
  onToggleGoal?: (e: React.MouseEvent) => void;
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
  onIncrement,
  onFinish,
  onEdit,
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
        {item.cover_image ? (
          <img
            src={item.cover_image}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={18} className="opacity-40 text-dark-subtext" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {hasNewRelease && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow-lg shadow-red-500/50 animate-pulse" />
        )}
        {item.is_goal && (
          <div
            className="absolute top-1 left-1 p-0.5 rounded bg-brand-500/80"
            title={item.goal_note || 'Objetivo'}
          >
            <Target size={9} className="text-white" />
          </div>
        )}
        {isFinished && (
          <div
            className="absolute top-1 right-1 p-0.5 rounded bg-emerald-500/90 text-white shadow"
            title="Concluído / Visto"
          >
            <CheckCircle size={9} />
          </div>
        )}
        {statusInfo && (
          <div
            className={`absolute bottom-2 left-1.5 w-1.5 h-1.5 rounded-full ${statusInfo.dot} shadow`}
            title={statusInfo.label}
          />
        )}

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40">
          <div
            className={`h-full transition-all duration-500 ${
              isFinished ? 'bg-emerald-400' : item.is_goal ? 'bg-brand-400' : 'bg-brand-500/80'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="px-1.5 py-1.5 flex items-baseline justify-between gap-1">
        <h3
          className="text-[10px] font-medium text-dark-text leading-tight line-clamp-1 flex-1"
          title={item.title}
        >
          {item.title}
        </h3>
        {isFinished ? (
          <span className="text-[9px] font-semibold text-emerald-400 flex-shrink-0">✓</span>
        ) : item.total_progress > 0 ? (
          <span className="text-[9px] text-zinc-500 flex-shrink-0">{percent}%</span>
        ) : null}
      </div>

      {/* Top right quick edit button on hover */}
      {onEdit && (
        <div className="absolute top-1.5 right-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Editar Obra"
            className="p-1 rounded-md bg-black/75 hover:bg-brand-500 text-white/80 hover:text-white backdrop-blur-sm transition-colors shadow"
          >
            <Pencil size={11} />
          </button>
        </div>
      )}

      {/* Center hover action overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
        {hasEpisodes ? (
          <button
            onClick={onOpenEpisodes}
            className="flex items-center gap-1 px-2 py-1 bg-brand-500 hover:bg-brand-600 rounded-md shadow-lg text-white text-[11px] font-semibold active:scale-95 transition-all"
            title="Ver Episódios"
          >
            <List size={12} />
            <span>Episódios</span>
          </button>
        ) : item.type === 'filme' ? (
          <button
            onClick={(e) => {
              if (onFinish) onFinish(e);
              else onIncrement(e);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold shadow-lg active:scale-95 transition-all ${
              isFinished
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title={isFinished ? 'Concluído' : 'Marcar como Visto'}
          >
            <CheckCircle size={12} />
            <span>{isFinished ? 'Visto' : 'Visto'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={onIncrement}
              disabled={isFinished}
              className="flex items-center gap-0.5 px-2 py-1 bg-white/20 hover:bg-white/30 rounded-md text-white text-[11px] font-semibold disabled:opacity-50 transition-all active:scale-95"
              title="Avançar progresso (+1)"
            >
              <Plus size={11} />
              <span>+1</span>
            </button>
            {onFinish && !isFinished && (
              <button
                onClick={onFinish}
                className="p-1 bg-emerald-600 hover:bg-emerald-500 rounded-md text-white transition-all active:scale-95"
                title="Marcar como Concluído"
              >
                <CheckCircle size={12} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

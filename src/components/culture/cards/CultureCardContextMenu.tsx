import React from 'react';
import { Target, CheckCircle, List, X } from 'lucide-react';
import type { CultureItem } from '../../../types';

interface CultureCardContextMenuProps {
  item: CultureItem;
  pos: { x: number; y: number };
  hasEpisodes: boolean;
  onFinish: (e: React.MouseEvent) => void;
  onToggleGoal: (e: React.MouseEvent) => void;
  onEditGoal: (e: React.MouseEvent) => void;
  onEpisodes: (e: React.MouseEvent) => void;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function CultureCardContextMenu({
  item,
  pos,
  hasEpisodes,
  onFinish,
  onToggleGoal,
  onEditGoal,
  onEpisodes,
  onEdit,
  onDelete
}: CultureCardContextMenuProps) {
  return (
    <div
      className="fixed z-[9999] bg-dark-card border border-white/10 rounded-lg shadow-2xl overflow-hidden animate-scale-up"
      style={{ top: pos.y, left: pos.x }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex flex-col text-sm min-w-[200px] p-1">
        <button onClick={onFinish} className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white rounded transition-colors text-left">
          <CheckCircle size={14} className="text-green-400" /><span>Marcar como Finalizado</span>
        </button>
        {!item.is_goal ? (
          <button onClick={onEditGoal} className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white rounded transition-colors text-left">
            <Target size={14} className="text-brand-400" /><span>Definir como Objetivo</span>
          </button>
        ) : (
          <>
            <button onClick={onEditGoal} className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white rounded transition-colors text-left">
              <Target size={14} className="text-brand-400" /><span>Editar Meta</span>
            </button>
            <button onClick={onToggleGoal} className="flex items-center gap-2 px-3 py-2 hover:bg-red-500/10 text-red-400 rounded transition-colors text-left">
              <X size={14} /><span>Remover dos Objetivos</span>
            </button>
          </>
        )}
        {hasEpisodes && (
          <button onClick={onEpisodes} className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white rounded transition-colors text-left">
            <List size={14} className="text-blue-400" /><span>Episódios</span>
          </button>
        )}
        <button onClick={onEdit} className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-white rounded transition-colors text-left">
          <List size={14} className="text-blue-400" /><span>Editar Detalhes</span>
        </button>
        <div className="h-px bg-white/10 my-1 mx-2" />
        <button onClick={onDelete} className="flex items-center gap-2 px-3 py-2 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded transition-colors text-left">
          <span className="font-medium">Excluir Obra</span>
        </button>
      </div>
    </div>
  );
}

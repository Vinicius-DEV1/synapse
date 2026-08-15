import React, { useState } from 'react';
import { Music, Trash2, Cloud, UploadCloud, Clock, GripVertical, Edit2, Check, X } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LofiItem } from '../../../types';

export interface SortableLofiItemProps {
  lofi: LofiItem;
  isActive: boolean;
  onTogglePlay: (lofi: LofiItem) => void;
  onDeleteCompletely: (lofi: LofiItem, e: React.MouseEvent) => void;
  onDeleteLocal: (lofi: LofiItem, e: React.MouseEvent) => void;
  deletingId: string | null;
  setDeletingId: (id: string | null) => void;
  onRename: (lofi: LofiItem, newTitle: string) => void;
  formatDuration: (seconds?: number | null) => string;
  isManualSort: boolean;
  isSelected: boolean;
  onToggleSelect: (lofi: LofiItem, e: React.MouseEvent) => void;
}

export function SortableLofiItem({
  lofi,
  isActive,
  onTogglePlay,
  onDeleteCompletely,
  onDeleteLocal,
  deletingId,
  setDeletingId,
  onRename,
  formatDuration,
  isManualSort,
  isSelected,
  onToggleSelect,
}: SortableLofiItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lofi.id, disabled: !isManualSort });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(lofi.title);

  const handleSaveRename = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (editTitle.trim() && editTitle.trim() !== lofi.title) {
      onRename(lofi, editTitle.trim());
    } else {
      setEditTitle(lofi.title);
    }
    setIsEditing(false);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTitle(lofi.title);
    setIsEditing(false);
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      onClick={() => { if (!isEditing) onTogglePlay(lofi); }}
      className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
        isActive 
          ? 'bg-brand-500/10 border-brand-500/30 text-white' 
          : isSelected
          ? 'bg-brand-500/10 border-brand-500/30 text-white'
          : 'bg-dark-card border-white/5 text-dark-subtext hover:bg-white/5 hover:text-white'
      }`}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleSelect(lofi, e); }}
        className={`w-5 h-5 rounded flex items-center justify-center border transition-all shrink-0 ${
          isSelected
            ? 'bg-brand-500 border-brand-500 text-white'
            : 'border-white/20 bg-dark-bg/50 hover:border-white/40 text-transparent'
        }`}
        title="Selecionar para ações em lote"
      >
        <Check size={12} className={isSelected ? 'opacity-100' : 'opacity-0'} />
      </button>

      {isManualSort && (
        <div 
          {...attributes} 
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-dark-subtext/50 hover:text-white transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </div>
      )}

      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        isActive ? 'bg-brand-500/20 text-brand-400' : 'bg-dark-bg text-dark-subtext'
      }`}>
        <Music size={20} />
      </div>
      
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <input 
              autoFocus
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveRename(e);
                if (e.key === 'Escape') {
                  setEditTitle(lofi.title);
                  setIsEditing(false);
                }
              }}
              className="bg-dark-bg border border-brand-500/50 rounded px-2 py-1 text-sm text-white w-full outline-none"
            />
            <button onClick={handleSaveRename} className="text-emerald-400 p-1 hover:bg-emerald-400/10 rounded">
              <Check size={14} />
            </button>
            <button onClick={handleCancelRename} className="text-rose-400 p-1 hover:bg-rose-400/10 rounded">
              <X size={14} />
            </button>
          </div>
        ) : (
          <p className="font-semibold text-sm truncate flex items-center gap-2 group">
            {lofi.title}
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-dark-subtext transition-all"
            >
              <Edit2 size={12} />
            </button>
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          {lofi.is_local && (
            <span className="text-[10px] flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
              <Cloud size={10} /> Local
            </span>
          )}
          {lofi.drive_file_id && (
            <span className="text-[10px] flex items-center gap-1 bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
              <UploadCloud size={10} /> Nuvem
            </span>
          )}
          {lofi.duration ? (
            <span className="text-[10px] flex items-center gap-1 text-dark-subtext ml-2">
              <Clock size={10} /> {formatDuration(lofi.duration)}
            </span>
          ) : null}
        </div>
      </div>
      
      <div className="shrink-0 flex items-center relative">
        <button 
          onClick={(e) => { e.stopPropagation(); setDeletingId(deletingId === lofi.id ? null : lofi.id); }}
          className="p-2 text-dark-subtext/50 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
        >
          <Trash2 size={16} />
        </button>
        
        {deletingId === lofi.id && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-dark-card border border-white/10 rounded-lg shadow-xl z-10 flex flex-col overflow-hidden">
            {lofi.is_local && (
              <button 
                onClick={(e) => onDeleteLocal(lofi, e)}
                className="text-left px-3 py-2 text-xs text-dark-subtext hover:bg-white/5 hover:text-white transition-colors border-b border-white/5"
              >
                Apagar apenas localmente
              </button>
            )}
            <button 
              onClick={(e) => onDeleteCompletely(lofi, e)}
              className="text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-400/10 transition-colors font-semibold"
            >
              Mover para a Lixeira
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

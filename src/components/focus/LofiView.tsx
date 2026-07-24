import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Music, Trash2, Cloud, UploadCloud, Clock, GripVertical, Edit2, Check, X } from 'lucide-react';
import { useFocusContext } from '../../store/FocusContext';
import { uploadNewLofi, deleteLofiCompletely, deleteLofiLocal, renameLofi, updateLofiOrder } from '../../services/lofi-manager';
import { useStore } from '../../store/useStore';
import type { LofiItem } from '../../types';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableLofiItemProps {
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
}

function SortableItem({
  lofi,
  isActive,
  onTogglePlay,
  onDeleteCompletely,
  onDeleteLocal,
  deletingId,
  setDeletingId,
  onRename,
  formatDuration,
  isManualSort
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
          : 'bg-dark-card border-white/5 text-dark-subtext hover:bg-white/5 hover:text-white'
      }`}
    >
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
              Apagar completamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export const LofiView: React.FC = () => {
  const { view, setView, lofis, activeLofi, setActiveLofi, isPlayingLofi, setIsPlayingLofi, loadLofis } = useFocusContext();
  const { state } = useStore();
  const masterKey = state.moduleKeys['focus'];
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const [sortMode, setSortMode] = useState<'manual' | 'date' | 'alpha'>('manual');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (view !== 'lofi') return null;

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,video/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      setIsUploading(true);
      setProgress(0);
      try {
        let duration: number | undefined;
        try {
          const url = URL.createObjectURL(file);
          duration = await new Promise((resolve) => {
            const audio = new Audio(url);
            audio.onloadedmetadata = () => {
              resolve(audio.duration);
              URL.revokeObjectURL(url);
            };
            audio.onerror = () => resolve(undefined);
          });
        } catch (e) {
          console.warn("Could not extract duration", e);
        }

        await uploadNewLofi(file, duration, masterKey, (p) => setProgress(p));
        await loadLofis();
        window.dispatchEvent(new Event('app-sync-trigger'));
      } catch (err) {
        console.error("Erro ao importar Lofi", err);
        alert("Erro ao importar Lofi");
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const handleDeleteCompletely = async (lofi: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteLofiCompletely(lofi);
      await loadLofis();
      window.dispatchEvent(new Event('app-sync-trigger'));
      if (activeLofi?.id === lofi.id) {
        setActiveLofi(null);
        setIsPlayingLofi(false);
      }
    } catch (err) {
      console.error("Erro ao deletar Lofi", err);
    }
    setDeletingId(null);
  };

  const handleDeleteLocal = async (lofi: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteLofiLocal(lofi);
      await loadLofis();
      if (activeLofi?.id === lofi.id) {
        setActiveLofi(null);
        setIsPlayingLofi(false);
      }
    } catch (err) {
      console.error("Erro ao deletar Lofi local", err);
    }
    setDeletingId(null);
  };

  const togglePlay = (lofi: any) => {
    if (activeLofi?.id === lofi.id) {
      setIsPlayingLofi(!isPlayingLofi);
    } else {
      setActiveLofi(lofi);
      setIsPlayingLofi(true);
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleRename = async (lofi: LofiItem, newTitle: string) => {
    await renameLofi(lofi, newTitle);
    await loadLofis();
    window.dispatchEvent(new Event('app-sync-trigger'));
  };

  const sortedLofis = useMemo(() => {
    const list = [...lofis];
    if (sortMode === 'date') {
      return list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }
    if (sortMode === 'alpha') {
      return list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [lofis, sortMode]);

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sortedLofis.findIndex(l => l.id === active.id);
      const newIndex = sortedLofis.findIndex(l => l.id === over.id);
      
      const newArray = arrayMove(sortedLofis, oldIndex, newIndex);
      const updatedItems = newArray.map((item, index) => ({
        ...item,
        order: index
      }));
      
      await updateLofiOrder(updatedItems);
      await loadLofis();
      window.dispatchEvent(new Event('app-sync-trigger'));
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-4 overflow-hidden">
      <header className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView('dashboard')}
            className="p-2 text-dark-subtext hover:text-white bg-dark-bg/50 border border-white/5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Lofi Station</h1>
            <p className="text-dark-subtext text-xs font-medium">Suas músicas para focar</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={sortMode}
            onChange={e => setSortMode(e.target.value as 'manual' | 'date' | 'alpha')}
            className="bg-dark-card border border-white/10 text-dark-subtext text-sm rounded-lg px-2 py-2 outline-none focus:border-brand-500"
          >
            <option value="manual">Manual</option>
            <option value="date">Mais Recentes</option>
            <option value="alpha">A-Z</option>
          </select>
          <button 
            onClick={handleImport}
            disabled={isUploading}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all text-sm disabled:opacity-50"
          >
            {isUploading ? (
              <span>Enviando {Math.round(progress)}%</span>
            ) : (
              <>
                <Plus size={16} />
                <span>Importar</span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-2 pb-20">
        {lofis.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-dark-subtext">
            <Music size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Nenhum lofi importado.</p>
            <p className="text-xs opacity-60">Clique em Importar para adicionar áudios ou vídeos.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedLofis.map(l => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 gap-2">
                {sortedLofis.map(lofi => (
                  <SortableItem
                    key={lofi.id}
                    lofi={lofi}
                    isActive={activeLofi?.id === lofi.id}
                    onTogglePlay={togglePlay}
                    onDeleteCompletely={handleDeleteCompletely}
                    onDeleteLocal={handleDeleteLocal}
                    deletingId={deletingId}
                    setDeletingId={setDeletingId}
                    onRename={handleRename}
                    formatDuration={formatDuration}
                    isManualSort={sortMode === 'manual'}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

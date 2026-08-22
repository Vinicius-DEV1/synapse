import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Music, Trash2 } from 'lucide-react';
import { useFocusContext } from '../../store/FocusContext';
import { updateLofiOrder } from '../../services/lofi-manager';
import { useStore } from '../../store/useStore';
import { SortableLofiItem } from './lofi/SortableLofiItem';
import { useLofiViewActions } from './hooks/useLofiViewActions';
import { formatDuration } from '../../utils/format';

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
} from '@dnd-kit/sortable';

export const LofiView: React.FC = () => {
  const { view, setView, lofis, activeLofi, setActiveLofi, isPlayingLofi, setIsPlayingLofi, loadLofis } = useFocusContext();
  const { state } = useStore();
  const masterKey = state.moduleKeys['focus'];
  const [sortMode, setSortMode] = useState<'manual' | 'date' | 'alpha'>('manual');

  const {
    isUploading,
    progress,
    uploadStatusText,
    deletingId,
    setDeletingId,
    selectedIds,
    setSelectedIds,
    handleImport,
    handleToggleSelect,
    handleBulkDeleteCompletely,
    handleBulkDeleteLocal,
    handleDeleteCompletely,
    handleDeleteLocal,
    handleRename,
    togglePlay
  } = useLofiViewActions({
    lofis,
    activeLofi,
    setActiveLofi,
    isPlayingLofi,
    setIsPlayingLofi,
    loadLofis,
    masterKey
  });

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
            <option className="bg-dark-bg text-white" value="manual">Manual</option>
            <option className="bg-dark-bg text-white" value="date">Mais Recentes</option>
            <option className="bg-dark-bg text-white" value="alpha">A-Z</option>
          </select>
          <button
            onClick={() => {
              if (selectedIds.size === lofis.length && lofis.length > 0) {
                setSelectedIds(new Set());
              } else {
                setSelectedIds(new Set(lofis.map(l => l.id)));
              }
            }}
            disabled={lofis.length === 0}
            className="px-3 py-2 rounded-lg border border-white/10 bg-dark-card text-dark-subtext hover:text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {selectedIds.size === lofis.length && lofis.length > 0 ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </button>
          <button 
            onClick={handleImport}
            disabled={isUploading}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all text-sm disabled:opacity-50"
          >
            {isUploading ? (
              <span>{uploadStatusText || `Enviando ${Math.round(progress)}%`}</span>
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
                  <SortableLofiItem
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
                    isSelected={selectedIds.has(lofi.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}

              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-dark-card border border-white/15 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 animate-slide-up">
          <span className="text-sm font-semibold text-white">
            {selectedIds.size} {selectedIds.size === 1 ? 'selecionado' : 'selecionados'}
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-dark-subtext hover:text-white transition-colors"
          >
            Desmarcar
          </button>
          <div className="h-4 w-px bg-white/15" />
          <button
            onClick={handleBulkDeleteLocal}
            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={13} />
            Apagar localmente ({selectedIds.size})
          </button>
          <button
            onClick={handleBulkDeleteCompletely}
            className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 size={13} />
            Mover para a Lixeira ({selectedIds.size})
          </button>
        </div>
      )}
    </div>
  );
};

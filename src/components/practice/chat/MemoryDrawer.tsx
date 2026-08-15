import React from 'react';
import { Brain, X, Trash2 } from 'lucide-react';
import type { TutorMemory } from '../../../types';

interface MemoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  memories: TutorMemory[];
  onDeleteMemory: (id: string) => void;
}

export function MemoryDrawer({ isOpen, onClose, memories, onDeleteMemory }: MemoryDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[60] bg-dark-bg/80 backdrop-blur-sm flex justify-end">
      <div className="w-[400px] h-full bg-dark-card border-l border-white/5 flex flex-col shadow-2xl animate-in slide-in-from-right-8 duration-300">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-brand-400">
            <Brain size={20} />
            <h3 className="font-semibold text-white">Memória da IA</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-dark-subtext"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <p className="text-sm text-dark-subtext mb-2">
            A IA pode extrair fatos importantes sobre você durante as conversas. Esses fatos são lembrados permanentemente em todas as sessões.
          </p>
          
          {memories.length === 0 ? (
            <div className="text-center py-10 opacity-50 flex flex-col items-center">
              <Brain size={32} className="mb-2 text-dark-subtext" />
              <p className="text-sm">A IA ainda não possui memórias globais salvas.</p>
            </div>
          ) : (
            memories.map(mem => (
              <div key={mem.id} className="p-4 bg-white/5 border border-white/5 rounded-xl group relative">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-500 mb-1 block">
                  {mem.category}
                </span>
                <p className="text-sm text-white/90 pr-8">{mem.fact}</p>
                <button
                  onClick={() => onDeleteMemory(mem.id)}
                  className="absolute top-4 right-4 p-1.5 opacity-0 group-hover:opacity-100 text-dark-subtext hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all"
                  title="Apagar memória"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

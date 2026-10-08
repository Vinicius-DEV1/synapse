import React, { useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Portal } from '../ui/Portal';
import type { BatteryWithQuestions } from '../../types/quiz';

interface BatteryDeleteModalProps {
  battery: BatteryWithQuestions | null;
  hasSubgroups: boolean;
  onClose: () => void;
  onConfirmDelete: (batteryId: string) => void;
}

export const BatteryDeleteModal = React.memo(function BatteryDeleteModal({
  battery,
  hasSubgroups,
  onClose,
  onConfirmDelete,
}: BatteryDeleteModalProps) {
  useEffect(() => {
    if (!battery) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [battery, onClose]);

  if (!battery) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4"
        onClick={onClose}
      >
        <div
          className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/10 text-rose-400 shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Excluir Bateria</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Deseja realmente mover a bateria <strong className="text-zinc-200">"{battery.title || 'Sem título'}"</strong> ({battery.questions.length} questões) para a lixeira?
              </p>
              {hasSubgroups && (
                <p className="text-[11px] text-zinc-400 mt-2 bg-white/5 p-2 rounded-lg border border-white/5">
                  ℹ️ Os subgrupos desta bateria não serão excluídos; eles serão mantidos e movidos para o nível principal.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                const id = battery.id;
                onClose();
                onConfirmDelete(id);
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-sm"
            >
              Excluir Bateria
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
});

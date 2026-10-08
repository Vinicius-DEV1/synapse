import { useState, useEffect } from 'react';
import { Folder, ArrowRight, X } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { getAvailableParentOptions } from '../../services/quiz/quizHierarchy';
import type { BatteryWithQuestions } from '../../types/quiz';

interface BatteryMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  battery: BatteryWithQuestions | null;
  allBatteries: BatteryWithQuestions[];
  onConfirmMove: (batteryId: string, newParentId: string | null) => Promise<void>;
}

export function BatteryMoveModal({
  isOpen,
  onClose,
  battery,
  allBatteries,
  onConfirmMove,
}: BatteryMoveModalProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(battery?.parent_id ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (battery) {
      setSelectedParentId(battery.parent_id ?? null);
    }
  }, [battery]);

  // Tecla Esc para fechar o modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !battery) return null;

  const parentOptions = getAvailableParentOptions(battery.id, allBatteries);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmMove(battery.id, selectedParentId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-xs animate-fade-in p-4"
        onClick={onClose}
      >
        <div
          className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
              <Folder size={16} className="text-brand-400" />
              <span>Mover Bateria para Grupo</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-zinc-300">
              Mover <span className="font-semibold text-white">"{battery.title}"</span> para:
            </p>
            <p className="text-[11px] text-zinc-500">
              Selecione o grupo pai ou envie para a raiz do Explorador.
            </p>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
            {/* Root Option */}
            <label
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                selectedParentId === null
                  ? 'bg-brand-500/15 border-brand-500/40 text-brand-200'
                  : 'bg-dark-bg/60 border-white/5 hover:border-white/10 text-zinc-300'
              }`}
            >
              <input
                type="radio"
                name="parentBattery"
                checked={selectedParentId === null}
                onChange={() => setSelectedParentId(null)}
                className="hidden"
              />
              <span className="w-2 h-2 rounded-full border border-current shrink-0" />
              <span className="font-medium">Nenhum (Nível Raiz)</span>
            </label>

            {/* Parent Options */}
            {parentOptions.map((opt) => {
              const isSelected = selectedParentId === opt.id;
              return (
                <label
                  key={opt.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-brand-500/15 border-brand-500/40 text-brand-200'
                      : 'bg-dark-bg/60 border-white/5 hover:border-white/10 text-zinc-300'
                  }`}
                  style={{ marginLeft: `${opt.depth * 14}px` }}
                >
                  <input
                    type="radio"
                    name="parentBattery"
                    checked={isSelected}
                    onChange={() => setSelectedParentId(opt.id)}
                    className="hidden"
                  />
                  <Folder size={13} className={isSelected ? 'text-brand-400' : 'text-zinc-500'} />
                  <span className="truncate">{opt.title}</span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            >
              <ArrowRight size={13} />
              <span>{isSubmitting ? 'Movendo...' : 'Confirmar'}</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

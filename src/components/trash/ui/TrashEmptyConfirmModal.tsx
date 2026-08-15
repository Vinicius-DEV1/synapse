import React from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

interface TrashEmptyConfirmModalProps {
  isOpen: boolean;
  totalItems: number;
  isEmptying: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function TrashEmptyConfirmModal({
  isOpen,
  totalItems,
  isEmptying,
  onClose,
  onConfirm
}: TrashEmptyConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4 animate-fade-in shrink-0">
      <AlertCircle size={24} className="text-red-400 shrink-0" />
      <div className="flex-1">
        <h3 className="text-lg font-bold text-red-400 mb-2">Esvaziar Lixeira Definitivamente?</h3>
        <p className="text-red-300/80 text-sm mb-4">
          Todos os {totalItems} itens serão permanentemente apagados do banco de dados local e da nuvem. Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            disabled={isEmptying}
            className="px-4 py-2 bg-dark-card border border-white/10 hover:bg-white/5 rounded-lg text-sm transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            disabled={isEmptying}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
          >
            {isEmptying && <Loader2 size={16} className="animate-spin" />}
            Confirmar Exclusão Permanente
          </button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Portal } from '../../../ui/Portal';

interface QuestionBlockDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const QuestionBlockDeleteModal = React.memo(function QuestionBlockDeleteModal({
  isOpen,
  onClose,
  onConfirm,
}: QuestionBlockDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-dark-card border border-white/10 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fade-in">
          <h4 className="text-sm font-semibold text-zinc-100">Remover Bloco de Questões?</h4>
          <p className="text-xs text-zinc-400 leading-relaxed">
            O card será removido desta nota. A bateria e suas questões{' '}
            <strong className="text-zinc-200">continuarão salvas no banco de dados</strong> e acessíveis no Módulo de Questões.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium cursor-pointer"
            >
              Remover da Nota
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
});

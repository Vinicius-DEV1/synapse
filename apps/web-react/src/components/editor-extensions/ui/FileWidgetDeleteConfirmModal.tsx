import React from 'react';
import { Portal } from '../../ui/Portal';
import { playUiClickSound } from '../../../utils/uiSounds';

interface FileWidgetDeleteConfirmModalProps {
  isDeleting: boolean;
  onCancel: () => void;
  onUnlink: () => void;
  onConfirmDelete: () => void;
}

export const FileWidgetDeleteConfirmModal: React.FC<FileWidgetDeleteConfirmModalProps> = ({
  isDeleting,
  onCancel,
  onUnlink,
  onConfirmDelete,
}) => {
  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        contentEditable={false}
      >
        <div
          className="bg-dark-card border border-red-500/20 rounded-xl p-5 w-[320px] shadow-2xl flex flex-col gap-4 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-white font-semibold text-lg text-center">Excluir Arquivo</h3>
          <p className="text-dark-subtext text-sm text-center">
            Deseja excluir este arquivo permanentemente do Caderno ou apenas desvincular desta página?
          </p>

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                playUiClickSound();
                onUnlink();
              }}
              disabled={isDeleting}
              className="flex-1 py-2 bg-dark-bg border border-white/10 hover:bg-white/5 text-white rounded-lg font-medium transition-colors text-sm"
            >
              Desvincular
            </button>
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={isDeleting}
              className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir de Tudo'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

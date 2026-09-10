import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Portal } from '../../ui/Portal';
import { playUiClickSound } from '../../../utils/uiSounds';

interface FileWidgetDeletedNoticeModalProps {
  fileName: string;
  onKeep: () => void;
  onRemove: () => void;
}

export const FileWidgetDeletedNoticeModal: React.FC<FileWidgetDeletedNoticeModalProps> = ({
  fileName,
  onKeep,
  onRemove,
}) => {
  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        contentEditable={false}
      >
        <div
          className="bg-dark-card border border-red-500/30 rounded-xl p-5 w-[340px] shadow-2xl flex flex-col gap-4 animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-base leading-tight">Arquivo Excluído</h3>
              <p className="text-dark-subtext text-xs mt-0.5">Anexo não encontrado ou na lixeira</p>
            </div>
          </div>

          <p className="text-dark-subtext text-sm leading-relaxed">
            O arquivo <strong className="text-white">"{fileName}"</strong> foi movido para a lixeira ou excluído do sistema. Deseja remover este widget do documento?
          </p>

          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={onKeep}
              className="flex-1 py-2 rounded-lg font-medium text-dark-subtext hover:bg-white/10 hover:text-white transition-colors text-sm"
            >
              Manter
            </button>
            <button
              type="button"
              onClick={() => {
                playUiClickSound();
                onRemove();
              }}
              className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm shadow-lg shadow-red-500/20"
            >
              Remover Widget
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};

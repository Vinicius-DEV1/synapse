import { AlertTriangle } from 'lucide-react';
import { Portal } from './ui/Portal';

interface ConfirmModalProps {
  pageId: string;
  pageName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ pageName, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-6 w-full max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="text-red-400" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-dark-text mb-1">
              Excluir página
            </h3>
            <p className="text-sm text-dark-subtext leading-relaxed">
              Tem certeza que deseja excluir <strong>{pageName}</strong>? Esta ação removerá também todas as sub-páginas e não pode ser desfeita.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-medium text-dark-text hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg shadow-red-500/20"
          >
            Sim, excluir
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

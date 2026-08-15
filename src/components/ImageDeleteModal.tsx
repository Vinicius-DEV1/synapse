import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ImageDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ImageDeleteModal({ isOpen, onClose, onConfirm }: ImageDeleteModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-dark-bg/95 border border-white/10 rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
          <h2 className="text-lg font-medium text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Excluir Imagem
          </h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-dark-subtext hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 text-dark-text text-sm">
          <p>Deseja realmente excluir esta imagem?</p>
          <p className="text-dark-subtext text-xs mt-2">Esta ação removerá a imagem do documento.</p>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-white/5 bg-black/20">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-dark-subtext hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 hover:text-red-200 rounded-lg transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

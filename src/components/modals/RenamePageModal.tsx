import { useState, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { Portal } from '../ui/Portal';

interface RenamePageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string;
  onRename: (newTitle: string) => void | Promise<void>;
}

export default function RenamePageModal({ isOpen, onClose, currentTitle, onRename }: RenamePageModalProps) {
  const [newTitle, setNewTitle] = useState(currentTitle);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNewTitle(currentTitle);
      setIsSubmitting(false);
    }
  }, [isOpen, currentTitle]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmed = newTitle.trim();
    if (trimmed && trimmed !== currentTitle) {
      try {
        setIsSubmitting(true);
        const res = onRename(trimmed);
        if (res instanceof Promise) {
          await res;
        }
      } catch (err) {
        console.error('[RenamePageModal] Error renaming page:', err);
      } finally {
        setIsSubmitting(false);
      }
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div 
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      >
      <div 
        className="bg-dark-card border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
        onKeyDown={handleKeyDown}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-subtext hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-bold text-white mb-4">Renomear Página</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-medium text-dark-subtext mb-1">Nome da Página</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
              placeholder="Digite o novo nome..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !newTitle.trim()}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Renomeando...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Renomear
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}

import { useEffect, useState } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { useTranslation } from '../../i18n';

interface CultureDeleteModalProps {
  isOpen: boolean;
  itemTitle: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function CultureDeleteModal({
  isOpen,
  itemTitle,
  onClose,
  onConfirm,
}: CultureDeleteModalProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    const handleBackPress = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm();
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      >
        <div
          className="bg-dark-card border border-white/[0.06] rounded-2xl shadow-2xl p-5 w-full max-w-sm animate-scale-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center">
                <AlertTriangle size={17} />
              </div>
              <h3 className="text-sm font-semibold text-white">
                {t('culture.deleteModalTitle', 'Excluir Obra Cultural')}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="p-1 text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="py-4">
            <p className="text-xs text-dark-subtext leading-relaxed">
              {t(
                'culture.deleteModalDesc',
                'Tem certeza que deseja excluir "{{title}}" do seu acervo? Esta ação não pode ser desfeita.',
                { title: itemTitle }
              )}
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-3.5 py-1.5 text-xs text-dark-subtext hover:text-white rounded-lg hover:bg-white/5 transition-colors font-medium disabled:opacity-50"
            >
              {t('common.cancel', 'Cancelar')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors font-medium flex items-center gap-1.5 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Trash2 size={13} />
              )}
              <span>{t('common.delete', 'Excluir')}</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

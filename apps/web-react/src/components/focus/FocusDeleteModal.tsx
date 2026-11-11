import React, { useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { useTranslation } from '../../i18n';

interface FocusDeleteModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;
}

export const FocusDeleteModal = React.memo(function FocusDeleteModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onClose,
  onConfirm,
  isDeleting = false,
}: FocusDeleteModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        e.preventDefault();
        onClose();
      }
    };

    const handleBackPress = (e: Event) => {
      if (!isDeleting) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('caderno-back-press', handleBackPress);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('caderno-back-press', handleBackPress);
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4"
        onClick={() => {
          if (!isDeleting) onClose();
        }}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-zinc-900 p-6 shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
              <Trash2 size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-white">
                {title}
              </h3>
              <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-xl border border-white/[0.06] bg-white/5 px-4 py-2 text-xs sm:text-sm font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
            >
              {cancelLabel || t('common.cancel', 'Cancelar')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="rounded-xl bg-rose-500 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
            >
              <Trash2 size={14} />
              {confirmLabel || t('common.delete', 'Excluir')}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
});

import React, { useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Portal } from '../../ui/Portal';
import { useTranslation } from '../../../i18n';

interface VaultDeleteModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  isDeleting?: boolean;
}

export const VaultDeleteModal = React.memo(function VaultDeleteModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onClose,
  onConfirm,
  isDeleting = false,
}: VaultDeleteModalProps) {
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
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                {description}
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
            >
              {cancelLabel || t('vault.cancel', 'Cancelar')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-600/20 transition-all hover:bg-rose-500 active:scale-95 disabled:opacity-50"
            >
              <Trash2 size={14} />
              <span>{isDeleting ? t('vault.saving', 'Salvando...') : (confirmLabel || t('vault.delete', 'Excluir'))}</span>
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
});

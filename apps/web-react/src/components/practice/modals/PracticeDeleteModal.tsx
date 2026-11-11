import React, { useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Portal } from '../../ui/Portal';
import { useTranslation } from '../../../i18n';

interface PracticeDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionTitle: string;
  onConfirmDelete: () => Promise<void> | void;
  isDeleting?: boolean;
}

export const PracticeDeleteModal = React.memo(function PracticeDeleteModal({
  isOpen,
  onClose,
  sessionTitle,
  onConfirmDelete,
  isDeleting = false,
}: PracticeDeleteModalProps) {
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
        onClick={isDeleting ? undefined : onClose}
      >
        <div
          className="bg-dark-card border border-white/[0.06] rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/10 text-rose-400 shrink-0">
              <Trash2 size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                {t('practice.deleteSessionTitle', 'Excluir Sessão de Prática')}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {t(
                  'practice.deleteSessionConfirm',
                  'Deseja realmente excluir esta sessão de prática? (Todos os áudios associados também serão apagados do disco)'
                )}
              </p>
              {sessionTitle && (
                <p className="text-[11px] text-zinc-300 mt-2 bg-white/5 p-2 rounded-lg border border-white/5 truncate font-medium">
                  {sessionTitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {t('practice.cancel', 'Cancelar')}
            </button>
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isDeleting ? t('common.deleting', 'Excluindo...') : t('practice.delete', 'Excluir Sessão')}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
});

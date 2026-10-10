import { useState, useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, AlertCircle, Info, Loader2, X } from 'lucide-react';
import { Portal } from './Portal';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const busy = isLoading || internalLoading;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (busy) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const raf = requestAnimationFrame(() => {
      confirmBtnRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, busy, onCancel]);

  if (!isOpen) return null;

  const handleConfirmClick = async () => {
    if (busy) return;
    try {
      const res = onConfirm();
      if (res instanceof Promise) {
        setInternalLoading(true);
        await res;
      }
    } finally {
      setInternalLoading(false);
    }
  };

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      icon: <AlertTriangle size={22} />,
      confirmBtn: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-rose-600/20',
      defaultConfirm: 'Sim, Excluir',
    },
    warning: {
      iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      icon: <AlertCircle size={22} />,
      confirmBtn: 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-amber-600/20',
      defaultConfirm: 'Continuar',
    },
    info: {
      iconBg: 'bg-brand-500/10 border-brand-500/20 text-brand-400',
      icon: <Info size={22} />,
      confirmBtn: 'bg-brand-600 hover:bg-brand-500 active:bg-brand-700 text-white shadow-brand-500/20',
      defaultConfirm: 'Confirmar',
    },
  }[variant];

  const resolvedConfirmText = confirmText || variantStyles.defaultConfirm;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in w-screen h-screen"
        onClick={(e) => {
          if (e.target === e.currentTarget && !busy) onCancel();
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div
          className="relative w-full max-w-md bg-dark-bg border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-scale-up p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${variantStyles.iconBg}`}
            >
              {variantStyles.icon}
            </div>
            <div className="flex-1 min-w-0 pr-6">
              <h3 id="confirm-dialog-title" className="text-base font-bold text-white leading-tight">
                {title}
              </h3>
              <div className="text-xs text-dark-subtext mt-1.5 leading-relaxed">
                {typeof message === 'string' ? <p>{message}</p> : message}
              </div>
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors disabled:opacity-40"
              title="Fechar"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5 mt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-dark-subtext hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-40"
            >
              {cancelText}
            </button>

            <button
              type="button"
              ref={confirmBtnRef}
              onClick={handleConfirmClick}
              disabled={busy}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 active:scale-[0.98] ${variantStyles.confirmBtn}`}
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Processando...
                </>
              ) : (
                resolvedConfirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

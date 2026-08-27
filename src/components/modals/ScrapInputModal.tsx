import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Globe, X, Download, Clipboard, AlertCircle } from 'lucide-react';
import { triggerToast } from '../ui/ToastContext';

export interface ScrapInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
  initialUrl?: string;
}

export function ScrapInputModal({
  isOpen,
  onClose,
  onConfirm,
  initialUrl = '',
}: ScrapInputModalProps) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl || '');
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setError(null);
      }
    } catch {
      triggerToast('Não foi possível ler a área de transferência', 'error');
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let clean = url.trim();
    if (!clean) {
      setError('Por favor, insira o link da página web.');
      return;
    }

    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(clean)) {
        clean = 'https://' + clean;
      } else {
        setError('URL inválida. Exemplo: https://exemplo.com/artigo');
        return;
      }
    }

    try {
      new URL(clean);
    } catch {
      setError('Formato de URL inválido. Verifique o endereço digitado.');
      return;
    }

    onConfirm(clean);
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in w-screen h-screen">
      <div 
        className="relative w-full max-w-lg bg-dark-bg border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/5 bg-gradient-to-b from-brand-primary/10 to-transparent">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/20 text-brand-primary flex items-center justify-center shrink-0 border border-brand-primary/30">
                <Globe size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">
                  Capturar Snapshot Web (Scrap)
                </h3>
                <p className="text-xs text-dark-subtext mt-0.5">
                  Salva a página 100% offline (HTML, CSS e Imagens)
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-dark-subtext hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-dark-text mb-2">
              Link da Página (URL):
            </label>

            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="https://exemplo.com/pagina-ou-artigo"
                className="w-full h-11 pl-4 pr-24 bg-white/5 border border-white/10 focus:border-brand-primary rounded-xl text-sm text-white placeholder:text-dark-subtext/60 focus:outline-none transition-colors"
              />

              <button
                type="button"
                onClick={handlePaste}
                className="absolute right-2 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-dark-text font-medium transition-colors flex items-center gap-1.5"
                title="Colar da Área de Transferência"
              >
                <Clipboard size={13} />
                Colar
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-2">
                <AlertCircle size={13} />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl text-[11px] text-dark-subtext leading-relaxed">
            💡 <strong>Dica:</strong> Você também pode digitar direto no editor <code className="text-brand-primary bg-white/5 px-1.5 py-0.5 rounded">/scrap https://link.com</code> para capturar instantaneamente.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-dark-subtext hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-primary hover:bg-brand-hover active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-brand-primary/25"
            >
              <Download size={14} />
              Capturar Snapshot
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

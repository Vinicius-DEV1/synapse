import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, Edit3, Loader2, AlertTriangle } from 'lucide-react';
import { Portal } from '../../../../components/ui/Portal';
import { useTranslation } from '../../../../i18n';

interface DocumentEditorViewProps {
  initialContent: string;
  fileName: string;
  onSave: (content: string) => Promise<boolean>;
  onCancel: () => void;
}

export function DocumentEditorView({
  initialContent,
  fileName,
  onSave,
  onCancel,
}: DocumentEditorViewProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = content !== initialContent;

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(content);
    } finally {
      setIsSaving(false);
    }
  }, [content, isSaving, onSave]);

  const handleCancel = useCallback(async () => {
    if (isDirty) {
      if (window.api?.app?.showConfirm) {
        const msg = t('files.discardChangesPrompt', 'Você possui alterações não salvas neste documento. Deseja realmente descartá-las e voltar à visualização?');
        const confirmed = (await window.api.app.showConfirm({
          title: t('files.discardChanges', 'Descartar Alterações'),
          message: msg,
          kind: 'warning',
        })) === 1;
        if (!confirmed) return;
      } else {
        setShowDiscardConfirm(true);
        return;
      }
    }
    onCancel();
  }, [isDirty, onCancel, t]);

  // Keyboard shortcut Ctrl+S or Cmd+S to save, Esc to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showDiscardConfirm) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowDiscardConfirm(false);
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleCancel, showDiscardConfirm]);

  // Android hardware back press listener for discard confirm modal
  useEffect(() => {
    if (!showDiscardConfirm) return;
    const handleBack = (e: Event) => {
      e.preventDefault();
      setShowDiscardConfirm(false);
    };
    window.addEventListener('caderno-back-press', handleBack);
    return () => window.removeEventListener('caderno-back-press', handleBack);
  }, [showDiscardConfirm]);

  // Tab key indent support inside textarea
  const handleKeyDownTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const updated = content.substring(0, start) + '  ' + content.substring(end);
      setContent(updated);

      requestAnimationFrame(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      });
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content.split('\n').length;

  return (
    <div className="flex flex-col w-full h-full bg-[#0f0f11] animate-fade-in">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-2.5 border-b border-white/5 bg-[#0f0f11]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 text-xs font-medium text-zinc-300">
          <Edit3 size={15} className="text-zinc-400" />
          <span>{t('files.editing', 'Editando:')} <strong className="font-semibold text-white">{fileName}</strong></span>
          {isDirty && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
              {t('files.modified', 'Modificado')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono mr-2 hidden sm:inline">
            Ctrl+S para salvar • Esc para sair
          </span>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <X size={13} />
            <span>{t('files.cancel', 'Cancelar')}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="px-3.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/15 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          >
            {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            <span>{t('files.save', 'Salvar')}</span>
          </button>
        </div>
      </div>

      {/* Main Textarea in Centered Reading Column */}
      <div className="flex-1 overflow-hidden w-full flex justify-center px-6 sm:px-12 py-6">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDownTextarea}
          placeholder="Digite ou edite o conteúdo em Markdown aqui..."
          spellCheck={false}
          className="w-full max-w-3xl h-full font-mono text-sm leading-[1.8] text-zinc-200 bg-transparent border-none outline-none focus:outline-none focus:ring-0 resize-none selection:bg-brand-500/30 placeholder:text-zinc-600"
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-6 sm:px-8 py-2 border-t border-white/5 bg-[#0f0f11] text-[11px] font-mono text-zinc-500 shrink-0">
        <div className="flex items-center gap-4">
          <span>{lineCount} {t('files.lines', 'linhas')}</span>
          <span>{wordCount} {t('files.words', 'palavras')}</span>
          <span>{content.length} {t('files.characters', 'caracteres')}</span>
        </div>
        <div>
          <span>Markdown UTF-8</span>
        </div>
      </div>

      {/* Discard Changes Non-Blocking In-App Modal */}
      {showDiscardConfirm && (
        <Portal>
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-dark-card border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-6 gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div className="text-center">
                <h3 className="text-base font-semibold text-white mb-1.5">{t('files.discardChanges', 'Descartar Alterações')}</h3>
                <p className="text-xs text-dark-subtext leading-relaxed">
                  {t('files.discardChangesPrompt', 'Você possui alterações não salvas neste documento. Deseja realmente descartá-las e voltar à visualização?')}
                </p>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-dark-subtext hover:text-white hover:bg-white/5 transition-colors"
                >
                  {t('files.continueEditing', 'Continuar Editando')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onCancel();
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
                >
                  {t('files.discard', 'Descartar')}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}

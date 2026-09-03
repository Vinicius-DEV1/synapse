import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, Edit3, Loader2 } from 'lucide-react';

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
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmDiscard = window.confirm(
        'Você possui alterações não salvas neste documento. Deseja realmente descartá-las e voltar à visualização?'
      );
      if (!confirmDiscard) return;
    }
    onCancel();
  }, [isDirty, onCancel]);

  // Keyboard shortcut Ctrl+S or Cmd+S to save, Esc to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [handleSave, handleCancel]);

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
    <div className="flex flex-col w-full h-full max-w-5xl mx-auto rounded-2xl border border-white/10 bg-dark-card/90 backdrop-blur-xl shadow-2xl overflow-hidden animate-fade-in">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-dark-bg/60">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Edit3 size={17} className="text-brand-400" />
          <span>Editando: <strong className="font-semibold text-brand-300">{fileName}</strong></span>
          {isDirty && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Modificado
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-dark-subtext font-mono mr-2 hidden sm:inline">
            Ctrl+S para salvar • Esc para sair
          </span>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-xl border border-white/10 text-dark-subtext hover:text-white hover:bg-white/10 text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <X size={14} />
            <span>Cancelar</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="px-4 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-950/40 transition-all active:scale-95 flex items-center gap-1.5"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="flex-1 p-4 bg-dark-bg/40 flex flex-col">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDownTextarea}
          placeholder="Digite ou edite o conteúdo em Markdown aqui..."
          spellCheck={false}
          className="flex-1 w-full p-4 rounded-xl bg-black/40 border border-white/5 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 outline-none font-mono text-sm leading-relaxed text-gray-200 resize-none transition-colors selection:bg-brand-500/30"
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-6 py-2 border-t border-white/5 bg-dark-bg/80 text-[11px] font-mono text-dark-subtext">
        <div className="flex items-center gap-4">
          <span>{lineCount} linhas</span>
          <span>{wordCount} palavras</span>
          <span>{content.length} caracteres</span>
        </div>
        <div>
          <span>Markdown UTF-8</span>
        </div>
      </div>
    </div>
  );
}

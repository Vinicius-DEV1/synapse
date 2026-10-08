import React from 'react';
import { Layers, Send, Loader2 } from 'lucide-react';
import type { ReferencedBattery } from '../../../../editor-extensions/quiz/types';

interface DocumentAiInputBarProps {
  inputPrompt: string;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  showMentionMenu: boolean;
  mentionQuery: string;
  mentionSelectedIndex: number;
  filteredBatteries: ReferencedBattery[];
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAttachBattery: (bat: ReferencedBattery) => void;
  onSubmit: () => void;
}

export const DocumentAiInputBar: React.FC<DocumentAiInputBarProps> = ({
  inputPrompt,
  isLoading,
  inputRef,
  showMentionMenu,
  mentionQuery,
  mentionSelectedIndex,
  filteredBatteries,
  onInputChange,
  onKeyDown,
  onAttachBattery,
  onSubmit,
}) => {
  return (
    <div className="p-4 border-t border-white/10 bg-dark-bg/60 relative">
      {/* Mention Autocomplete Dropdown */}
      {showMentionMenu && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-dark-card border border-brand-500/40 rounded-xl shadow-2xl overflow-hidden z-50 max-h-56 overflow-y-auto animate-fade-in">
          <div className="px-3 py-1.5 border-b border-white/10 bg-dark-bg/80 text-[11px] font-semibold text-brand-400 flex items-center gap-1.5">
            <Layers size={13} />
            <span>Baterias de Questões Disponíveis</span>
          </div>
          {filteredBatteries.length === 0 ? (
            <div className="p-3 text-xs text-dark-subtext text-center">
              Nenhuma bateria encontrada com "{mentionQuery}"
            </div>
          ) : (
            filteredBatteries.map((bat, idx) => (
              <button
                key={bat.id}
                type="button"
                onClick={() => onAttachBattery(bat)}
                className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                  idx === mentionSelectedIndex
                    ? 'bg-brand-500/20 text-white'
                    : 'hover:bg-white/5 text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Layers size={14} className="text-brand-400 shrink-0" />
                  <div className="truncate">
                    <span className="font-medium text-white">{bat.title}</span>
                    <span className="text-[10px] text-dark-subtext ml-2">Página: {bat.pageTitle}</span>
                  </div>
                </div>
                <span className="text-[11px] text-dark-subtext shrink-0 ml-2 font-mono">
                  {bat.questionCount} {bat.questionCount === 1 ? 'questão' : 'questões'}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputPrompt}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          placeholder="Peça à IA para editar o texto ou digite @ para marcar uma bateria de questões..."
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-xs text-white placeholder:text-dark-subtext outline-none transition-colors"
        />

        <button
          type="submit"
          disabled={!inputPrompt.trim() || isLoading}
          className="p-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:hover:bg-brand-500 text-white transition-all shadow-lg shadow-brand-950/40 active:scale-95"
          title="Enviar instrução"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
};

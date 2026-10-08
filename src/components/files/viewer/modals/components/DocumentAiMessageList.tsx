import React from 'react';
import { Sparkles, FileDiff, Loader2 } from 'lucide-react';
import type { DocumentAiMessage } from '../../services/documentAiService';
import type { QuestionItem, ReferencedBattery } from '../../../../editor-extensions/quiz/types';
import { QuizQuestionsGeneratedCard } from './QuizQuestionsGeneratedCard';

const QUICK_SUGGESTIONS = [
  '🔍 Aprofundar o tópico principal',
  '✍️ Melhorar clareza e estilo',
  '✂️ Remover redundâncias e simplificar',
  '📝 Adicionar introdução e conclusão',
  '📊 Estruturar em tópicos e tabelas',
];

interface DocumentAiMessageListProps {
  messages: DocumentAiMessage[];
  isLoading: boolean;
  addedQuestionMessageIndices: Set<number>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSelectSuggestion: (sug: string) => void;
  onViewDiff: (proposedMarkdown: string) => void;
  onAddQuestions: (battery: ReferencedBattery, questions: QuestionItem[], msgIndex: number) => Promise<void> | void;
}

export const DocumentAiMessageList: React.FC<DocumentAiMessageListProps> = ({
  messages,
  isLoading,
  addedQuestionMessageIndices,
  messagesEndRef,
  onSelectSuggestion,
  onViewDiff,
  onAddQuestions,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto text-dark-subtext">
          <div className="p-4 bg-brand-500/10 text-brand-400 rounded-2xl mb-3">
            <Sparkles size={32} />
          </div>
          <h4 className="text-white font-medium text-base mb-1">
            Como posso ajudar com este documento?
          </h4>
          <p className="text-xs leading-relaxed mb-6">
            Peça análises, aprofundamento de tópicos ou digite <strong className="text-brand-300">@</strong> para marcar uma bateria de questões e pedir novas questões baseadas no texto.
          </p>

          <div className="flex flex-wrap gap-2 justify-center">
            {QUICK_SUGGESTIONS.map((sug) => (
              <button
                key={sug}
                type="button"
                onClick={() => onSelectSuggestion(sug)}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-brand-500/20 hover:border-brand-500/40 text-xs text-gray-300 hover:text-white transition-all text-left"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed shadow-md ${
              msg.role === 'user'
                ? 'bg-brand-600 text-white rounded-tr-sm'
                : 'bg-dark-bg/80 border border-white/10 text-gray-200 rounded-tl-sm'
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.text}</p>

            {/* Generated Questions Card */}
            {msg.generatedQuestions && msg.targetBattery && (
              <QuizQuestionsGeneratedCard
                battery={msg.targetBattery}
                questions={msg.generatedQuestions}
                isAdded={addedQuestionMessageIndices.has(idx)}
                onAdd={async (bat, qList) => {
                  await onAddQuestions(bat, qList, idx);
                }}
              />
            )}

            {/* Proposed Markdown Diff Button */}
            {msg.proposedMarkdown && (
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  ✓ Nova versão do documento gerada
                </span>
                <button
                  type="button"
                  onClick={() => onViewDiff(msg.proposedMarkdown!)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition-colors flex items-center gap-1"
                >
                  <FileDiff size={13} />
                  <span>Ver Alterações (Diff)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-dark-bg/80 border border-white/10 text-brand-400 text-xs shadow-md">
            <Loader2 size={15} className="animate-spin" />
            <span>Analisando documento e formulando resposta...</span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

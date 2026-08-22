import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, CheckCheck, X } from 'lucide-react';
import { markdownComponents, preprocessMarkdownCode } from '../../utils/markdownPreprocess';
import { QuizAiActionCard } from './QuizAiActionCard';
import type { QuestionItem, QuizChatMessage, SuggestedAction } from '../../types';

interface QuizAiMessageItemProps {
  msg: QuizChatMessage;
  questions: QuestionItem[];
  onAcceptAction: (action: SuggestedAction) => void;
  onRejectAction: (action: SuggestedAction) => void;
  onAcceptAllInMessage?: (msgId: string) => void;
  onRejectAllInMessage?: (msgId: string) => void;
}

export function QuizAiMessageItem({
  msg,
  questions,
  onAcceptAction,
  onRejectAction,
  onAcceptAllInMessage,
  onRejectAllInMessage,
}: QuizAiMessageItemProps) {
  const isUser = msg.role === 'user';
  const actions = msg.suggestedActions || [];
  const pendingActions = actions.filter((a) => a.status === 'pending');
  const acceptedActions = actions.filter((a) => a.status === 'accepted');

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[92%] rounded-2xl p-4 text-xs leading-relaxed space-y-3 shadow-lg ${
          isUser
            ? 'bg-purple-600 text-white shadow-purple-600/20'
            : 'bg-dark-card border border-purple-500/20 text-purple-100'
        }`}
      >
        {/* Texto da mensagem */}
        <div className="leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents as any}
          >
            {preprocessMarkdownCode(msg.text)}
          </ReactMarkdown>
        </div>

        {/* Sugestões de Ação da IA */}
        {actions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-purple-500/20 space-y-3">
            {/* Action Header with Batch Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-400" />
                  <span>Ações Propostas ({actions.length}):</span>
                </span>
                {acceptedActions.length > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-300">
                    {acceptedActions.length} aplicada(s)
                  </span>
                )}
              </div>

              {pendingActions.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {onAcceptAllInMessage && (
                    <button
                      onClick={() => onAcceptAllInMessage(msg.id)}
                      className="px-2.5 py-1 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold text-[11px] transition-all flex items-center gap-1 shadow-md shadow-green-600/20"
                      title="Aplicar todas as ações pendentes na bateria"
                    >
                      <CheckCheck size={13} />
                      <span>Aplicar Todas ({pendingActions.length})</span>
                    </button>
                  )}
                  {onRejectAllInMessage && (
                    <button
                      onClick={() => onRejectAllInMessage(msg.id)}
                      className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 rounded-lg font-medium text-[11px] transition-colors flex items-center gap-1"
                      title="Rejeitar todas as ações pendentes"
                    >
                      <X size={13} />
                      <span>Rejeitar Todas</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Lista de Cards de Ações Propostas */}
            <div className="space-y-3">
              {actions.map((action, actionIdx) => (
                <QuizAiActionCard
                  key={action.id || `action_${actionIdx}`}
                  action={action}
                  actionIdx={actionIdx}
                  questions={questions}
                  onAcceptAction={onAcceptAction}
                  onRejectAction={onRejectAction}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

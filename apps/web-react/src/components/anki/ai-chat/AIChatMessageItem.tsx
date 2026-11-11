import type { ChatMessage } from '../../../hooks/useAIActions';
import {
  ActionCreateCards,
  ActionDeleteCard,
  ActionDeleteBulk,
  ActionEditCards,
} from './ChatActionBlocks';

interface AIChatMessageItemProps {
  msg: ChatMessage;
  idx: number;
  actionStatus: Record<string, boolean>;
  deckCards: any[];
  setActiveReviewAction: (action: { msgIdx: number; actIdx: number } | null) => void;
  setSuggestions: (suggs: any[]) => void;
  handleExecuteAction: (action: any, actionKey: string) => Promise<void>;
}

export function AIChatMessageItem({
  msg,
  idx,
  actionStatus,
  deckCards,
  setActiveReviewAction,
  setSuggestions,
  handleExecuteAction,
}: AIChatMessageItemProps) {
  return (
    <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl p-4 flex flex-col gap-2 ${
          msg.role === 'user'
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-dark-bg border border-white/5 text-dark-text rounded-tl-sm'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
        {msg.tokens && (
          <div className="flex justify-end mt-1">
            <span
              className="text-[10px] opacity-40 font-mono flex items-center gap-1"
              title={`Prompt: ${msg.tokens.promptTokenCount} | Resposta: ${msg.tokens.candidatesTokenCount}`}
            >
              ⚡ {msg.tokens.totalTokenCount} tokens
            </span>
          </div>
        )}
      </div>

      {msg.actions &&
        msg.actions.map((act, actIdx) => {
          const actionKey = `${idx}-${actIdx}`;

          if (act.type === 'create') {
            return (
              <ActionCreateCards
                key={actIdx}
                act={act}
                msgIdx={idx}
                actIdx={actIdx}
                actionStatus={actionStatus}
                actionKey={actionKey}
                setActiveReviewAction={setActiveReviewAction}
                setSuggestions={setSuggestions}
              />
            );
          }
          if (act.type === 'delete') {
            return (
              <ActionDeleteCard
                key={actIdx}
                act={act}
                actionStatus={actionStatus}
                actionKey={actionKey}
                handleExecuteAction={handleExecuteAction}
              />
            );
          }
          if (act.type === 'delete_bulk') {
            return (
              <ActionDeleteBulk
                key={actIdx}
                act={act}
                actionStatus={actionStatus}
                actionKey={actionKey}
                handleExecuteAction={handleExecuteAction}
              />
            );
          }
          return null;
        })}

      {/* Handle multiple edits consolidated */}
      {(() => {
        const editActions =
          msg.actions
            ?.map((act, actIdx) => ({ act, actIdx, actionKey: `${idx}-${actIdx}` }))
            .filter((x) => x.act.type === 'edit') || [];
        if (editActions.length === 0) return null;
        return (
          <ActionEditCards
            editActions={editActions}
            actionStatus={actionStatus}
            handleExecuteAction={handleExecuteAction}
            deckCards={deckCards}
          />
        );
      })()}
    </div>
  );
}

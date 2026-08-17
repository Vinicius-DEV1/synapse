import { useState } from 'react';

declare module '../api/types' {
  interface AnkiApi {
    getCard?: (id: string) => Promise<any>;
  }
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  actions?: any[];
  tokens?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export function useAIActions(deckId: string) {
  const [actionStatus, setActionStatus] = useState<Record<string, boolean>>({});

  const handleExecuteAction = async (action: any, actionKey: string) => {
    if (!window.api?.anki) return;
    try {
      if (action.type === 'edit') {
        const card = await window.api.anki.getCard?.(action.card_id);
        if (card) {
          await window.api.anki.updateCard(action.card_id, {
            deck_id: deckId,
            front: action.new_front !== undefined ? action.new_front : card.front,
            back: action.new_back !== undefined ? action.new_back : card.back,
            tags: action.new_tags !== undefined ? action.new_tags : card.tags
          });
        }
      } else if (action.type === 'delete') {
        await window.api.anki.deleteCardsBulk([action.card_id]);
      } else if (action.type === 'delete_bulk') {
        const ids = (action.cards_to_delete || []).map((c: any) => c.card_id);
        await window.api.anki.deleteCardsBulk(ids);
      }
      setActionStatus(prev => ({ ...prev, [actionKey]: true }));
    } catch (e) {
      console.error(e);
      alert('Erro ao executar ação');
    }
  };

  return {
    actionStatus,
    setActionStatus,
    handleExecuteAction
  };
}

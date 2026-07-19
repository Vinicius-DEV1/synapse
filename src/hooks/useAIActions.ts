import { useState } from 'react';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  actions?: any[];
}

export function useAIActions(deckId: string) {
  const [actionStatus, setActionStatus] = useState<Record<string, boolean>>({});

  const handleExecuteAction = async (action: any, actionKey: string) => {
    if (!window.api?.anki) return;
    try {
      if (action.type === 'edit') {
        const card = await window.api.anki.getCard(action.card_id);
        if (card && card.note_id) {
          await window.api.anki.updateNote(card.note_id, {
            deck_id: deckId,
            front: action.new_front,
            back: action.new_back
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

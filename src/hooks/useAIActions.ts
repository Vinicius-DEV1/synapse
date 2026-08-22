import { useState } from 'react';
import { triggerToast } from '../components/ui/ToastContext';

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
          triggerToast('Cartão atualizado com sucesso pela IA!', 'success');
        }
      } else if (action.type === 'delete') {
        await window.api.anki.deleteCardsBulk([action.card_id]);
        triggerToast('Cartão excluído com sucesso pela IA.', 'info');
      } else if (action.type === 'delete_bulk') {
        const ids = (action.cards_to_delete || []).map((c: any) => c.card_id);
        await window.api.anki.deleteCardsBulk(ids);
        triggerToast(`${ids.length} cartões excluídos com sucesso pela IA.`, 'info');
      }
      setActionStatus(prev => ({ ...prev, [actionKey]: true }));
    } catch (e: any) {
      console.error(e);
      triggerToast(e.message || 'Erro ao executar ação da IA.', 'error');
    }
  };

  return {
    actionStatus,
    setActionStatus,
    handleExecuteAction
  };
}

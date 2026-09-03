import React from 'react';
import { Volume2, Eye, Edit3, Trash2 } from 'lucide-react';
import type { Deck, Card } from '../types';
import { HtmlRenderer } from '../components/HtmlRenderer';

interface CardTableViewProps {
  groupedCards: Card[][];
  filteredCardsLength: number;
  selectedIds: Set<string>;
  toggleSelectAll: () => void;
  toggleSelectGroup: (group: Card[]) => void;
  
  decks: Deck[];
  deckId: string;
  
  handleMouseEnter: (e: React.MouseEvent, id: string, type: 'front' | 'back', content: string) => void;
  handleMouseLeave: () => void;
  playAudio: (url: string) => void;
  
  setPreviewCard: (card: Card) => void;
  setEditingCard: (card: Card) => void;
  handleDeleteCard: (id: string) => void;
}

export function CardTableView({
  groupedCards, filteredCardsLength, selectedIds,
  toggleSelectAll, toggleSelectGroup,
  decks, deckId,
  handleMouseEnter, handleMouseLeave, playAudio,
  setPreviewCard, setEditingCard, handleDeleteCard
}: CardTableViewProps) {
  return (
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-dark-border/50 text-dark-subtext text-xs uppercase tracking-wider">
          <th className="p-3 w-10">
            <input 
              type="checkbox" 
              checked={selectedIds.size === filteredCardsLength && filteredCardsLength > 0} 
              onChange={toggleSelectAll}
              className="rounded border-dark-border bg-dark-bg text-indigo-600 focus:ring-indigo-500"
            />
          </th>
          <th className="p-3 w-1/3">Frente</th>
          <th className="p-3 w-1/3">Verso</th>
          <th className="p-3 w-20 text-center">Áudio</th>
          <th className="p-3 w-32">Tipo</th>
          <th className="p-3 text-right">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {groupedCards.map(group => {
          const card = group[0];
          const isSelected = group.every(c => selectedIds.has(c.id));
          return (
          <tr key={card.note_id || card.id} className="hover:bg-dark-card transition-colors group">
            <td className="p-3">
              <input 
                type="checkbox" 
                checked={isSelected}
                onChange={() => toggleSelectGroup(group)}
                className="rounded border-dark-border bg-dark-bg text-indigo-600 focus:ring-indigo-500"
              />
            </td>
            <td 
              className="p-3 text-sm text-dark-text max-w-xs truncate cursor-default"
              onMouseEnter={(e) => handleMouseEnter(e, card.id, 'front', card.front)}
              onMouseLeave={handleMouseLeave}
            >
              {card.deck_id !== deckId && (
                <span className="inline-block mr-2 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-500/30 whitespace-nowrap align-middle">
                  {decks.find(d => d.id === card.deck_id)?.name || 'Subbaralho'}
                </span>
              )}
              {card.tags && card.tags.map((t: string, idx: number) => (
                <span key={`${t}-${idx}`} className="inline-block mr-2 px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-[10px] font-bold uppercase tracking-wider align-middle border border-indigo-500/20 whitespace-nowrap">#{t}</span>
              ))}
              {group.length > 1 && (
                <span className="inline-flex items-center justify-center bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded mr-2 border border-indigo-500/30 align-middle" title={`${group.length} cartões nesta nota`}>
                  [{group.length}]
                </span>
              )}
              <HtmlRenderer html={card.front} />
            </td>
            <td 
              className="p-3 text-sm text-dark-subtext max-w-xs truncate cursor-default" 
              onMouseEnter={(e) => handleMouseEnter(e, card.id, 'back', card.back)}
              onMouseLeave={handleMouseLeave}
            >
              <HtmlRenderer html={card.back} />
            </td>
            <td className="p-3 text-center">
              {card.media_url && (
                <button onClick={() => playAudio(card.media_url!)} className="text-dark-subtext hover:text-indigo-400 p-1">
                  <Volume2 size={16} />
                </button>
              )}
            </td>
            <td className="p-3 text-xs text-dark-subtext">
              <span className="px-2 py-1 rounded bg-white/5 text-dark-subtext border border-white/10">{card.card_type}</span>
            </td>
            <td className="p-3 text-right">
              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setPreviewCard(card)} className="p-1.5 text-dark-subtext hover:text-indigo-400 hover:bg-white/10 rounded" title="Visualizar">
                  <Eye size={16} />
                </button>
                <button onClick={() => setEditingCard(card)} className="p-1.5 text-dark-subtext hover:text-indigo-400 hover:bg-white/10 rounded" title="Editar">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => handleDeleteCard(card.id)} className="p-1.5 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded" title="Excluir">
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        )})}
      </tbody>
    </table>
  );
}

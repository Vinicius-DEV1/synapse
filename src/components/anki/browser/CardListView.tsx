import React from 'react';
import { Volume2, Edit3, Trash2 } from 'lucide-react';
import type { Deck, Card } from '../types';
import { HtmlRenderer } from '../components/HtmlRenderer';

interface CardListViewProps {
  groupedCards: Card[][];
  selectedIds: Set<string>;
  toggleSelectGroup: (group: Card[]) => void;
  
  decks: Deck[];
  deckId: string;
  
  playAudio: (url: string) => void;
  setEditingCard: (card: Card) => void;
  handleDeleteCard: (id: string) => void;
}

export function CardListView({
  groupedCards, selectedIds, toggleSelectGroup,
  decks, deckId,
  playAudio, setEditingCard, handleDeleteCard
}: CardListViewProps) {
  return (
    <div className="max-w-4xl flex flex-col gap-6 mx-auto w-full">
      {groupedCards.map(group => {
        const card = group[0];
        const isSelected = group.every(c => selectedIds.has(c.id));
        return (
          <div key={card.note_id} className={`bg-dark-card border rounded-2xl p-5 flex flex-col hover:shadow-2xl transition-all ${isSelected ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/5 hover:border-white/20'}`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="px-2 py-1 rounded bg-black/40 text-dark-subtext text-[10px] uppercase font-bold tracking-wider">{card.card_type}</span>
                {card.deck_id !== deckId && (
                  <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-500/30 truncate max-w-[120px]">
                    {decks.find(d => d.id === card.deck_id)?.name || 'Subbaralho'}
                  </span>
                )}
                {card.tags && card.tags.map((t: string) => (
                  <span key={t} className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-300 text-[10px] border border-indigo-500/20 font-bold uppercase tracking-wider">#{t}</span>
                ))}
                {group.length > 1 && (
                  <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/30" title={`${group.length} cartões nesta nota`}>
                    [{group.length}]
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {card.media_url && (
                  <button onClick={() => playAudio(card.media_url!)} className="p-1.5 bg-black/40 hover:bg-black/60 text-indigo-400 rounded-lg transition-colors" title="Ouvir Áudio">
                    <Volume2 size={14} />
                  </button>
                )}
                <div className="flex items-center gap-1 border-r border-white/10 pr-3 mr-1">
                  <button onClick={() => setEditingCard(card)} className="p-1.5 text-dark-subtext hover:text-indigo-400 hover:bg-white/10 rounded-lg transition-colors" title="Editar">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDeleteCard(card.id)} className="p-1.5 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors" title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
                <input 
                  type="checkbox" 
                  checked={isSelected}
                  onChange={() => toggleSelectGroup(group)}
                  className="rounded border-dark-border bg-dark-bg text-indigo-600 focus:ring-indigo-500 scale-125 cursor-pointer"
                />
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 flex flex-row gap-6">
              <div className="flex-1 border-r border-white/5 pr-6">
                <div className="text-[10px] text-dark-subtext uppercase tracking-widest mb-2 opacity-70">Frente</div>
                <HtmlRenderer html={card.front} className="text-sm text-dark-text whitespace-pre-wrap leading-relaxed overflow-y-auto custom-scrollbar block" />
              </div>
              
              <div className="flex-1">
                <div className="text-[10px] text-dark-subtext uppercase tracking-widest mb-2 opacity-70">Verso</div>
                <HtmlRenderer html={card.back} className="text-sm text-dark-subtext whitespace-pre-wrap leading-relaxed overflow-y-auto custom-scrollbar block" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

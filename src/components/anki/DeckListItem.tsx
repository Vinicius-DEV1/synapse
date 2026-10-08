import React from 'react';
import { Play, Plus, Settings, Layers, ChevronDown, ChevronRight } from 'lucide-react';
import type { Deck, DeckTreeNode } from './types';

interface DeckListItemProps {
  deck: DeckTreeNode;
  depth?: number;
  collapsedDecks: Set<string>;
  toggleDeckCollapse: (deckId: string) => void;
  deckStats: Record<string, { novos: number; aprender: number; revisar: number }>;
  onCreateSubDeck: (deckId: string) => void;
  onManageDeck: (deck: Deck) => void;
  onStudyDeck: (deckId: string) => void;
}

export const DeckListItem: React.FC<DeckListItemProps> = ({
  deck,
  depth = 0,
  collapsedDecks,
  toggleDeckCollapse,
  deckStats,
  onCreateSubDeck,
  onManageDeck,
  onStudyDeck,
}) => {
  const isCollapsed = collapsedDecks.has(deck.id);
  const hasChildren = Boolean(deck.children && deck.children.length > 0);

  return (
    <div className="flex flex-col w-full">
      <div
        className="bg-dark-card p-4 rounded-xl border border-white/5 flex items-center justify-between cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all duration-300 group"
        style={{ marginLeft: `${depth * 24}px`, marginTop: depth > 0 ? '8px' : '16px' }}
      >
        <div className="flex-1 min-w-0 pr-4 flex items-center gap-3">
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleDeckCollapse(deck.id);
              }}
              className="p-1 rounded hover:bg-white/10 text-dark-subtext transition-colors"
              title={isCollapsed ? 'Expandir' : 'Recolher'}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
            </button>
          ) : (
            <div className="w-[26px]"></div>
          )}
          <Layers className="text-indigo-400 shrink-0" size={20} />
          <div>
            <h3 className="text-lg font-semibold text-white/90 group-hover:text-white transition-colors truncate">
              {deck.name}
            </h3>
            {deck.description && (
              <p className="text-dark-subtext text-xs mt-1 truncate">{deck.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-6 shrink-0">
          <div className="flex gap-3 text-xs font-medium bg-dark-bg px-3 py-1.5 rounded-lg border border-white/5">
            <div className="text-blue-400/80 flex items-center gap-1" title="Novos Cartões">
              <span className="w-2 h-2 rounded-full bg-blue-400/50"></span>
              {deckStats[deck.id]?.novos || 0}
            </div>
            <div className="text-orange-400/80 flex items-center gap-1" title="Aprendendo">
              <span className="w-2 h-2 rounded-full bg-orange-400/50"></span>
              {deckStats[deck.id]?.aprender || 0}
            </div>
            <div className="text-green-400/80 flex items-center gap-1" title="A Revisar Hoje">
              <span className="w-2 h-2 rounded-full bg-green-400/50"></span>
              {deckStats[deck.id]?.revisar || 0}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateSubDeck(deck.id);
              }}
              className="flex items-center justify-center p-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-colors"
              title="Criar Subbaralho"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => onManageDeck(deck)}
              className="flex items-center justify-center p-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-colors"
              title="Gerenciar Baralho"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => onStudyDeck(deck.id)}
              className="flex items-center gap-2 bg-indigo-600/90 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-sm transition-all font-medium"
            >
              <Play className="w-3 h-3 fill-white" />
              Estudar
            </button>
          </div>
        </div>
      </div>
      {!isCollapsed &&
        hasChildren &&
        deck.children?.map((child) => (
          <DeckListItem
            key={child.id}
            deck={child}
            depth={depth + 1}
            collapsedDecks={collapsedDecks}
            toggleDeckCollapse={toggleDeckCollapse}
            deckStats={deckStats}
            onCreateSubDeck={onCreateSubDeck}
            onManageDeck={onManageDeck}
            onStudyDeck={onStudyDeck}
          />
        ))}
    </div>
  );
};

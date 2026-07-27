import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, HardDrive } from 'lucide-react';
import { Portal } from '../ui/Portal';
import CardEditor from './CardEditor';
import DeckSettingsPanel from './DeckSettingsPanel';

import { useDecks } from './hooks/useDecks';
import { useDeckCards } from './hooks/useDeckCards';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useCardSelection } from './hooks/useCardSelection';

import { DeckToolbar } from './browser/DeckToolbar';
import type { DeckFilters } from './browser/DeckToolbar';
import { CardTableView } from './browser/CardTableView';
import { CardGridView } from './browser/CardGridView';
import { CardListView } from './browser/CardListView';
import { CardPreviewModal } from './browser/CardPreviewModal';
import { HtmlRenderer } from './components/HtmlRenderer';
import type { Deck, Card, CardDraft } from './types';

interface DeckBrowserProps {
  deck: Deck;
  onClose: () => void;
  onDeckDeleted: () => void;
  onDeckUpdated: (deck: Deck) => void;
}

export default function DeckBrowser({ deck, onClose, onDeckDeleted, onDeckUpdated }: DeckBrowserProps) {
  const { decks } = useDecks();
  const { cards, loading, refresh: loadCards } = useDeckCards(deck.id);
  const { play: playAudio } = useAudioPlayer();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<DeckFilters>({
    type: 'all',
    validation: 'all',
    media: 'all',
    state: 'all',
    deck: 'all',
    tag: 'all',
  });
  
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'list'>('table');
  const [showFilters, setShowFilters] = useState(true);

  const [hoverState, setHoverState] = useState<{ id: string, type: 'front' | 'back', content: string, x: number, y: number } | null>(null);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, id: string, type: 'front' | 'back', content: string) => {
    const x = e.clientX;
    const y = e.clientY;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setHoverState({ id, type, content, x, y });
    }, 1500);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    setHoverState(null);
  };

  const filteredCards = React.useMemo(() => {
    return cards.filter(c => {
      const matchesSearch = c.front.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.back.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filters.type === 'all' || c.card_type === filters.type;
      const matchesValidation = filters.validation === 'all' || (c.validation_mode || 'exact') === filters.validation;
      const matchesMedia = filters.media === 'all' || (filters.media === 'with_media' ? !!c.media_url : !c.media_url);
      
      let stateStr = 'new';
      if (c.state === 1 || c.state === 3) stateStr = 'learning';
      else if (c.state === 2) stateStr = 'review';
      
      const matchesState = filters.state === 'all' || stateStr === filters.state;
      const matchesDeck = filters.deck === 'all' || c.deck_id === filters.deck;
      const matchesTag = filters.tag === 'all' || (c.tags && c.tags.includes(filters.tag));
      
      return matchesSearch && matchesType && matchesValidation && matchesMedia && matchesState && matchesDeck && matchesTag;
    });
  }, [cards, searchQuery, filters]);

  const { selectedIds, toggleSelectAll, toggleSelectGroup, clearSelection } = useCardSelection(filteredCards);

  const allTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    cards.forEach(c => {
      if (c.tags) c.tags.forEach((t: string) => tagsSet.add(t));
    });
    return Array.from(tagsSet).sort();
  }, [cards]);

  const groupedCards = React.useMemo(() => {
    const groups = new Map<string, Card[]>();
    for (const c of filteredCards) {
      if (!groups.has(c.note_id)) groups.set(c.note_id, []);
      groups.get(c.note_id)!.push(c);
    }
    return Array.from(groups.values());
  }, [filteredCards]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.size} cartões?`)) return;
    if (window.api?.anki) {
      await window.api.anki.deleteCardsBulk(Array.from(selectedIds));
      clearSelection();
      loadCards();
    }
  };

  const handleMoveSelected = async (targetDeckId: string) => {
    if (!window.confirm(`Mover ${selectedIds.size} cartões para o baralho selecionado?`)) return;
    if (window.api?.anki) {
      for (const id of selectedIds) {
        await window.api.anki.updateCard(id, { deck_id: targetDeckId });
      }
      clearSelection();
      loadCards();
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm('ATENÇÃO: A exclusão de um cartão do tipo "Completar" (Cloze) apagará também todos os outros cartões criados a partir do mesmo texto original.\n\nDeseja excluir a nota original inteira?')) return;
    if (window.api?.anki) {
      await window.api.anki.deleteCard(id);
      loadCards();
    }
  };

  const handleUpdateDeck = async (name: string, desc: string, newLim: number, revLim: number, weights: string) => {
    if (window.api?.anki) {
      await window.api.anki.updateDeck(deck.id, name, desc);
      if (window.api.anki.updateDeckSettings) {
        await window.api.anki.updateDeckSettings(deck.id, {
          new_limit: newLim,
          review_limit: revLim,
          fsrs_weights: weights.trim() || null
        });
      }
      setShowSettings(false);
      onDeckUpdated({ ...deck, name, description: desc });
    }
  };

  const handleDeleteDeck = async () => {
    if (!window.confirm(`ATENÇÃO! Tem certeza que deseja excluir o baralho "${deck.name}" e TODOS os seus cartões?`)) return;
    if (window.api?.anki) {
      await window.api.anki.deleteDeck(deck.id);
      onDeckDeleted();
    }
  };

  const handleResetProgress = async () => {
    if (!window.confirm(`ATENÇÃO! Isso apagará o histórico de estudos e voltará TODOS os cartões para o estado "Novo". Deseja realmente resetar o progresso do baralho "${deck.name}"?`)) return;
    if (window.api?.anki?.resetDeckProgress) {
      const res = await window.api.anki.resetDeckProgress(deck.id);
      if (res.success) {
        window.alert('Progresso resetado com sucesso!');
        loadCards();
      } else {
        window.alert('Erro ao resetar: ' + res.error);
      }
    }
  };

  if (editingCard || isCreatingCard) {
    return (
      <CardEditor
        draft={editingCard ? {
          front: editingCard.front,
          back: editingCard.back,
          extra_note: editingCard.extra_note,
          media_url: editingCard.media_url,
          card_type: editingCard.card_type,
          validation_mode: editingCard.validation_mode,
          source_module: editingCard.source_module,
          source_id: editingCard.source_id,
          deck_id: editingCard.deck_id
        } : {
          front: '',
          back: '',
          card_type: 'reading',
          source_module: 'manual'
        }}
        editingCardId={editingCard ? editingCard.id : undefined}
        parentDeckId={deck.id}
        onClose={() => {
          setEditingCard(null);
          setIsCreatingCard(false);
          loadCards();
        }}
      />
    );
  }

  return (
    <Portal>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onMouseDown={onClose}>
      <div 
        className="bg-dark-card w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-dark-border h-[90vh]"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className={`flex-1 flex flex-col relative custom-scrollbar ${previewCard ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          
          {/* Header */}
          <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-bg shrink-0">
            <div>
              <h2 className="text-2xl font-bold text-dark-text flex items-center gap-2">
                <HardDrive className="text-indigo-400" />
                {deck.name}
              </h2>
              <p className="text-sm text-dark-subtext mt-1">{deck.description}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded hover:bg-white/10 transition-colors ${showSettings ? 'bg-white/10 text-indigo-400' : 'text-dark-subtext'}`}
                title="Configurações do Baralho"
              >
                <Settings size={20} />
              </button>
              <button onClick={onClose} className="p-2 text-dark-subtext hover:text-white rounded hover:bg-white/10 transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="shrink-0 border-b border-white/5">
              <DeckSettingsPanel 
                deck={deck} 
                onSave={handleUpdateDeck} 
                onDelete={handleDeleteDeck} 
                onResetProgress={handleResetProgress} 
              />
            </div>
          )}

          <DeckToolbar 
            deck={deck} decks={decks} allTags={allTags}
            searchQuery={searchQuery} setSearchQuery={setSearchQuery}
            filters={filters} setFilters={setFilters}
            showFilters={showFilters} setShowFilters={setShowFilters}
            viewMode={viewMode} setViewMode={setViewMode}
            selectedIds={selectedIds} 
            handleDeleteSelected={handleDeleteSelected} 
            handleMoveSelected={handleMoveSelected}
            setIsCreatingCard={setIsCreatingCard}
          />

          <div className="flex-1 p-4 flex flex-col">
            {loading ? (
              <div className="w-full flex flex-col gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 w-full bg-dark-card border border-dark-border rounded-lg animate-pulse flex items-center px-4 gap-4">
                    <div className="w-4 h-4 bg-white/5 rounded"></div>
                    <div className="flex-1 flex gap-4">
                      <div className="h-4 bg-white/5 rounded w-1/3"></div>
                      <div className="h-4 bg-white/5 rounded w-1/3"></div>
                    </div>
                    <div className="w-24 h-4 bg-white/5 rounded"></div>
                  </div>
                ))}
              </div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-12 text-dark-subtext">Nenhum cartão encontrado neste baralho.</div>
            ) : viewMode === 'table' ? (
              <CardTableView 
                groupedCards={groupedCards} filteredCardsLength={filteredCards.length}
                selectedIds={selectedIds} toggleSelectAll={toggleSelectAll} toggleSelectGroup={toggleSelectGroup}
                decks={decks} deckId={deck.id}
                handleMouseEnter={handleMouseEnter} handleMouseLeave={handleMouseLeave} playAudio={playAudio}
                setPreviewCard={setPreviewCard} setEditingCard={setEditingCard} handleDeleteCard={handleDeleteCard}
              />
            ) : viewMode === 'list' ? (
              <CardListView 
                groupedCards={groupedCards} selectedIds={selectedIds} toggleSelectGroup={toggleSelectGroup}
                decks={decks} deckId={deck.id} playAudio={playAudio}
                setEditingCard={setEditingCard} handleDeleteCard={handleDeleteCard}
              />
            ) : (
              <CardGridView 
                groupedCards={groupedCards} selectedIds={selectedIds} toggleSelectGroup={toggleSelectGroup}
                decks={decks} deckId={deck.id} playAudio={playAudio}
                setEditingCard={setEditingCard} handleDeleteCard={handleDeleteCard}
              />
            )}
          </div>
        </div>

        {previewCard && (
          <CardPreviewModal 
            previewCard={previewCard} filteredCards={filteredCards} 
            setPreviewCard={setPreviewCard} setEditingCard={setEditingCard} handleDeleteCard={handleDeleteCard} 
          />
        )}
      </div>

      {hoverState && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed z-[9999] bg-dark-card border border-indigo-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-xl p-5 max-w-md w-max pointer-events-none animate-fade-in"
          style={{ left: Math.min(hoverState.x + 15, window.innerWidth - 450), top: Math.min(hoverState.y + 15, window.innerHeight - 200) }}
        >
          <div className="text-[10px] text-indigo-400 font-bold mb-2 uppercase tracking-widest">
            {hoverState.type === 'front' ? 'Frente Completa' : 'Verso Completo'}
          </div>
          <HtmlRenderer html={hoverState.content} className="text-sm text-white leading-relaxed whitespace-pre-wrap block" as="div" />
        </div>,
        document.body
      )}
    </div>
    </Portal>
  );
}

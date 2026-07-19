import React, { useEffect, useState, useRef } from 'react';
import { X, Search, Trash2, Edit3, Settings, Volume2, HardDrive, Eye, LayoutGrid, LayoutList, Table, Filter } from 'lucide-react';
import CardEditor from './CardEditor';
import DeckSettingsPanel from './DeckSettingsPanel';
import { useDecks } from './hooks/useDecks';
import { useDeckCards } from './hooks/useDeckCards';
import { useAudioPlayer } from './hooks/useAudioPlayer';

interface DeckBrowserProps {
  deck: any;
  onClose: () => void;
  onDeckDeleted: () => void;
  onDeckUpdated: (deck: any) => void;
}

export default function DeckBrowser({ deck, onClose, onDeckDeleted, onDeckUpdated }: DeckBrowserProps) {
  const { decks } = useDecks();
  const { cards, loading, refresh: loadCards } = useDeckCards(deck.id);
  const { play: playAudio } = useAudioPlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterValidation, setFilterValidation] = useState<string>('all');
  const [filterMedia, setFilterMedia] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');
  const [filterDeck, setFilterDeck] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  
  // Preview
  const [previewCard, setPreviewCard] = useState<any | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  
  // Deck settings mode
  const [showSettings, setShowSettings] = useState(false);

  // View Mode
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'list'>('table');

  // Filters visibility
  const [showFilters, setShowFilters] = useState(true);

  // Hover Tooltip State
  const [hoverState, setHoverState] = useState<{ id: string, type: 'front' | 'back', content: string, x: number, y: number } | null>(null);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, id: string, type: 'front' | 'back', content: string) => {
    const x = e.clientX;
    const y = e.clientY;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setHoverState({ id, type, content, x, y });
    }, 2000);
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
      const matchesType = filterType === 'all' || c.card_type === filterType;
      const matchesValidation = filterValidation === 'all' || (c.validation_mode || 'exact') === filterValidation;
      const matchesMedia = filterMedia === 'all' || (filterMedia === 'with_media' ? !!c.media_url : !c.media_url);
      
      let stateStr = 'new';
      if (c.state === 1 || c.state === 3) stateStr = 'learning';
      else if (c.state === 2) stateStr = 'review';
      
      const matchesState = filterState === 'all' || stateStr === filterState;
      const matchesDeck = filterDeck === 'all' || c.deck_id === filterDeck;
      
      return matchesSearch && matchesType && matchesValidation && matchesMedia && matchesState && matchesDeck;
    });
  }, [cards, searchQuery, filterType, filterValidation, filterMedia, filterState, filterDeck]);

  const groupedCards = React.useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const c of filteredCards) {
      if (!groups.has(c.note_id)) groups.set(c.note_id, []);
      groups.get(c.note_id)!.push(c);
    }
    return Array.from(groups.values());
  }, [filteredCards]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCards.map(c => c.id)));
    }
  };

  const toggleSelectGroup = (group: any[]) => {
    const newSet = new Set(selectedIds);
    const allSelected = group.every(c => newSet.has(c.id));
    for (const c of group) {
      if (allSelected) newSet.delete(c.id);
      else newSet.add(c.id);
    }
    setSelectedIds(newSet);
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedIds.size} cartões?`)) return;
    
    if (window.api?.anki) {
      await window.api.anki.deleteCardsBulk(Array.from(selectedIds));
      setSelectedIds(new Set());
      loadCards();
    }
  };

  const handleMoveSelected = async (targetDeckId: string) => {
    if (!window.confirm(`Mover ${selectedIds.size} cartões para o baralho selecionado?`)) return;
    
    if (window.api?.anki) {
      for (const id of selectedIds) {
        await window.api.anki.updateCard(id, { deck_id: targetDeckId });
      }
      setSelectedIds(new Set());
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
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onMouseDown={onClose}>
      <div 
        className="bg-dark-card w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-dark-border h-[90vh]"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col relative">
          
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

          {/* Toolbar (Sticky) */}
          <div className="sticky top-0 z-20 p-4 border-b border-white/5 flex flex-wrap justify-between items-center gap-4 bg-dark-card/95 backdrop-blur-md shrink-0 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`p-2 rounded-xl transition-colors border ${showFilters ? 'bg-white/10 border-white/20 text-indigo-400' : 'bg-dark-card border-white/5 text-dark-subtext hover:bg-white/5 hover:text-white'}`}
                title="Mostrar/Ocultar Filtros"
              >
                <Filter size={18} />
              </button>

              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-subtext" />
                <input 
                  type="text" 
                  placeholder="Buscar cartões..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-dark-card border border-white/5 rounded-xl text-sm text-dark-text focus:outline-none focus:border-white/10 transition-all placeholder-dark-subtext/50"
                />
              </div>
              
              {showFilters && (
                <>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-dark-card border border-white/5 rounded-xl text-sm text-dark-text px-3 py-2 focus:outline-none cursor-pointer hover:border-white/20 transition-colors">
                <option value="all">Tipos (Todos)</option>
                <option value="reading">Leitura</option>
                <option value="listening">Escuta</option>
                <option value="typing">Digitação</option>
                <option value="cloze">Completar (Cloze)</option>
              </select>

              <select value={filterValidation} onChange={e => setFilterValidation(e.target.value)} className="bg-dark-card border border-white/5 rounded-xl text-sm text-dark-text px-3 py-2 focus:outline-none cursor-pointer hover:border-white/20 transition-colors">
                <option value="all">Validação (Todas)</option>
                <option value="exact">Exata</option>
                <option value="ai">Com IA</option>
              </select>

              <select value={filterMedia} onChange={e => setFilterMedia(e.target.value)} className="bg-dark-card border border-white/5 rounded-xl text-sm text-dark-text px-3 py-2 focus:outline-none cursor-pointer hover:border-white/20 transition-colors">
                <option value="all">Mídia (Ambos)</option>
                <option value="with_media">Com Áudio</option>
                <option value="without_media">Sem Áudio</option>
              </select>

              <select value={filterState} onChange={e => setFilterState(e.target.value)} className="bg-dark-card border border-white/5 rounded-xl text-sm text-dark-text px-3 py-2 focus:outline-none cursor-pointer hover:border-white/20 transition-colors">
                <option value="all">Estado (Todos)</option>
                <option value="new">Novos</option>
                <option value="learning">Aprendendo</option>
                <option value="review">Revisão</option>
              </select>

              <select value={filterDeck} onChange={e => setFilterDeck(e.target.value)} className="bg-dark-card border border-white/5 rounded-xl text-sm text-dark-text px-3 py-2 focus:outline-none cursor-pointer hover:border-white/20 transition-colors max-w-[150px] truncate">
                <option value="all">Baralho (Todos)</option>
                {decks.filter(d => d.id === deck.id || d.parent_id === deck.id).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 border-r border-white/10 pr-3">
                  <span className="text-sm text-indigo-400 font-medium">{selectedIds.size} selecionados</span>
                  
                  <select
                     className="bg-dark-card border border-white/10 rounded-lg px-3 py-1.5 text-sm text-dark-text focus:outline-none cursor-pointer max-w-[150px] truncate"
                     onChange={(e) => {
                       if (e.target.value) {
                         handleMoveSelected(e.target.value);
                         e.target.value = '';
                       }
                     }}
                     value=""
                  >
                     <option value="" disabled>Mover para...</option>
                     {decks.map(d => (
                         <option key={d.id} value={d.id}>{d.name}</option>
                     ))}
                  </select>

                  <button onClick={handleDeleteSelected} className="flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded-lg text-sm transition-colors">
                    <Trash2 size={16} /> Excluir
                  </button>
                </div>
              )}
              
              <div className="flex bg-dark-bg border border-white/5 rounded-lg p-0.5">
                <button 
                  onClick={() => setViewMode('table')} 
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
                  title="Visualização em Tabela (Densa)"
                >
                  <Table size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
                  title="Lista Expandida"
                >
                  <LayoutList size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('grid')} 
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-dark-subtext hover:text-white hover:bg-white/5'}`}
                  title="Grade Expandida"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>

              <button 
                onClick={() => setIsCreatingCard(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Novo Cartão
              </button>
            </div>
          </div>

          {/* Table / Grid / List */}
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
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-border/50 text-dark-subtext text-xs uppercase tracking-wider">
                    <th className="p-3 w-10">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.size === filteredCards.length && filteredCards.length > 0} 
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
                    <tr key={card.note_id} className="hover:bg-dark-card transition-colors group">
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
                        {card.deck_id !== deck.id && (
                          <span className="inline-block mr-2 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-500/30 whitespace-nowrap align-middle">
                            {decks.find(d => d.id === card.deck_id)?.name || 'Subbaralho'}
                          </span>
                        )}
                        {group.length > 1 && (
                          <span className="inline-flex items-center justify-center bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded mr-2 border border-indigo-500/30 align-middle" title={`${group.length} cartões nesta nota`}>
                            [{group.length}]
                          </span>
                        )}
                        <span dangerouslySetInnerHTML={{ __html: card.front }}></span>
                      </td>
                      <td 
                        className="p-3 text-sm text-dark-subtext max-w-xs truncate cursor-default" 
                        dangerouslySetInnerHTML={{ __html: card.back }}
                        onMouseEnter={(e) => handleMouseEnter(e, card.id, 'back', card.back)}
                        onMouseLeave={handleMouseLeave}
                      ></td>
                      <td className="p-3 text-center">
                        {card.media_url && (
                          <button onClick={() => playAudio(card.media_url)} className="text-dark-subtext hover:text-indigo-400 p-1">
                            <Volume2 size={16} />
                          </button>
                        )}
                      </td>
                      <td className="p-3 text-xs text-dark-subtext">
                        <span className="px-2 py-1 rounded bg-white/5 text-dark-subtext border border-white/10">{card.card_type}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setPreviewCard(card); setShowAnswer(false); }} className="p-1.5 text-dark-subtext hover:text-indigo-400 hover:bg-white/10 rounded" title="Visualizar">
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
            ) : (
              <div className={`p-4 mx-auto w-full ${viewMode === 'list' ? 'max-w-4xl flex flex-col gap-6' : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
                {groupedCards.map(group => {
                  const card = group[0];
                  const isSelected = group.every(c => selectedIds.has(c.id));
                  return (
                    <div key={card.note_id} className={`bg-dark-card border rounded-2xl p-5 flex flex-col hover:shadow-2xl transition-all ${isSelected ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' : 'border-white/5 hover:border-white/20'}`}>
                      {/* Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-wrap gap-2 items-center">
                          <span className="px-2 py-1 rounded bg-black/40 text-dark-subtext text-[10px] uppercase font-bold tracking-wider">{card.card_type}</span>
                          {card.deck_id !== deck.id && (
                            <span className="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-[10px] border border-indigo-500/30 truncate max-w-[120px]">
                              {decks.find(d => d.id === card.deck_id)?.name || 'Subbaralho'}
                            </span>
                          )}
                          {group.length > 1 && (
                            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/30" title={`${group.length} cartões nesta nota`}>
                              [{group.length}]
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {card.media_url && (
                            <button onClick={() => playAudio(card.media_url)} className="p-1.5 bg-black/40 hover:bg-black/60 text-indigo-400 rounded-lg transition-colors" title="Ouvir Áudio">
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
                      <div className={`flex-1 ${viewMode === 'list' ? 'flex flex-row gap-6' : 'flex flex-col gap-4'}`}>
                        <div className={`${viewMode === 'list' ? 'flex-1 border-r border-white/5 pr-6' : ''}`}>
                          <div className="text-[10px] text-dark-subtext uppercase tracking-widest mb-2 opacity-70">Frente</div>
                          <div className={`text-sm text-dark-text whitespace-pre-wrap leading-relaxed overflow-y-auto custom-scrollbar ${viewMode === 'list' ? '' : 'max-h-48'}`} dangerouslySetInnerHTML={{ __html: card.front }}></div>
                        </div>
                        
                        {viewMode !== 'list' && <div className="h-px bg-white/5 w-full"></div>}
                        
                        <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
                          <div className="text-[10px] text-dark-subtext uppercase tracking-widest mb-2 opacity-70">Verso</div>
                          <div className={`text-sm text-dark-subtext whitespace-pre-wrap leading-relaxed overflow-y-auto custom-scrollbar ${viewMode === 'list' ? '' : 'max-h-48'}`} dangerouslySetInnerHTML={{ __html: card.back }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Preview Modal */}
        {previewCard && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-[200] p-4 animate-fade-in">
            <button onClick={() => setPreviewCard(null)} className="absolute top-6 right-6 p-2 text-white hover:bg-white/10 rounded-lg transition-colors">
              <X size={24} />
            </button>
            <div className="w-full max-w-2xl bg-dark-bg border border-white/10 rounded-2xl p-10 shadow-2xl flex flex-col items-center">
              <div className="text-xl text-center text-white min-h-[100px] flex items-center justify-center break-words w-full" dangerouslySetInnerHTML={{ __html: previewCard.front }}></div>
              
              {showAnswer ? (
                <>
                  <div className="w-full h-px bg-white/10 my-8"></div>
                  <div className="text-lg text-center text-dark-subtext min-h-[100px] flex items-center justify-center break-words w-full" dangerouslySetInnerHTML={{ __html: previewCard.back }}></div>
                </>
              ) : (
                <button 
                  onClick={() => setShowAnswer(true)} 
                  className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  Mostrar Resposta
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hover Tooltip Modal */}
      {hoverState && (
        <div 
          className="fixed z-[300] bg-dark-card border border-indigo-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.5)] rounded-xl p-5 max-w-md w-max pointer-events-none animate-fade-in"
          style={{ 
            left: Math.min(hoverState.x + 15, window.innerWidth - 450), 
            top: Math.min(hoverState.y + 15, window.innerHeight - 200) 
          }}
        >
          <div className="text-[10px] text-indigo-400 font-bold mb-2 uppercase tracking-widest">
            {hoverState.type === 'front' ? 'Frente Completa' : 'Verso Completo'}
          </div>
          <div className="text-sm text-white leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: hoverState.content }}></div>
        </div>
      )}
    </div>
  );
}

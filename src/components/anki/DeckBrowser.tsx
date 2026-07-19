import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, Edit3, Settings, Volume2, HardDrive } from 'lucide-react';
import CardEditor from './CardEditor';

interface DeckBrowserProps {
  deck: any;
  onClose: () => void;
  onDeckDeleted: () => void;
  onDeckUpdated: (deck: any) => void;
}

export default function DeckBrowser({ deck, onClose, onDeckDeleted, onDeckUpdated }: DeckBrowserProps) {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterValidation, setFilterValidation] = useState<string>('all');
  const [filterMedia, setFilterMedia] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [isCreatingCard, setIsCreatingCard] = useState(false);
  
  // Deck settings mode
  const [showSettings, setShowSettings] = useState(false);
  const [deckName, setDeckName] = useState(deck.name);
  const [deckDesc, setDeckDesc] = useState(deck.description || '');
  
  // Settings
  const [newLimit, setNewLimit] = useState(20);
  const [reviewLimit, setReviewLimit] = useState(200);
  const [fsrsWeights, setFsrsWeights] = useState('');

  useEffect(() => {
    loadCards();
    loadSettings();
  }, [deck.id]);

  const loadSettings = async () => {
    if (window.api?.anki?.getDeckSettings) {
      const s = await window.api.anki.getDeckSettings(deck.id);
      if (s) {
        setNewLimit(s.new_limit || 20);
        setReviewLimit(s.review_limit || 200);
        setFsrsWeights(s.fsrs_weights || '');
      }
    }
  };

  const loadCards = async () => {
    setLoading(true);
    if (window.api?.anki) {
      const res = await window.api.anki.getAllCards(deck.id);
      if (res && res.success && res.cards) {
        setCards(res.cards);
      } else if (Array.isArray(res)) {
        setCards(res);
      }
    }
    setLoading(false);
  };

  const filteredCards = cards.filter(c => {
    const matchesSearch = c.front.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.back.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || c.card_type === filterType;
    const matchesValidation = filterValidation === 'all' || (c.validation_mode || 'exact') === filterValidation;
    const matchesMedia = filterMedia === 'all' || (filterMedia === 'with_media' ? !!c.media_url : !c.media_url);
    
    return matchesSearch && matchesType && matchesValidation && matchesMedia;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCards.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCards.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
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

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm('Excluir este cartão?')) return;
    if (window.api?.anki) {
      await window.api.anki.deleteCard(id);
      loadCards();
    }
  };

  const handleUpdateDeck = async () => {
    if (window.api?.anki) {
      await window.api.anki.updateDeck(deck.id, deckName, deckDesc);
      
      if (window.api.anki.updateDeckSettings) {
        await window.api.anki.updateDeckSettings(deck.id, {
          new_limit: Number(newLimit),
          review_limit: Number(reviewLimit),
          fsrs_weights: fsrsWeights.trim() || null
        });
      }
      
      setShowSettings(false);
      onDeckUpdated({ ...deck, name: deckName, description: deckDesc });
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

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(e => console.error("Audio error:", e));
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
          source_id: editingCard.source_id
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
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-dark-card w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-dark-border h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-bg">
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

        {/* Body */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {showSettings && (
            <div className="absolute top-0 left-0 right-0 bg-dark-card p-8 border-b border-white/5 z-10 animate-fade-in shadow-2xl">
              <h3 className="text-lg font-medium mb-4 text-dark-text">Configurações do Baralho</h3>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-medium text-dark-subtext mb-1">Nome do Baralho</label>
                  <input type="text" value={deckName} onChange={e => setDeckName(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-indigo-500 transition-colors hover:border-white/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-dark-subtext mb-1">Descrição</label>
                  <input type="text" value={deckDesc} onChange={e => setDeckDesc(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm text-dark-text focus:outline-none focus:border-indigo-500 transition-colors hover:border-white/20" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-dark-subtext mb-1">Limite Diário (Novos)</label>
                    <input type="number" min="0" value={newLimit} onChange={e => setNewLimit(Number(e.target.value))} className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-sm text-dark-text focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-dark-subtext mb-1">Limite Diário (Revisão)</label>
                    <input type="number" min="0" value={reviewLimit} onChange={e => setReviewLimit(Number(e.target.value))} className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2 text-sm text-dark-text focus:outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-dark-subtext mb-1">Pesos FSRS (Opcional - JSON Array)</label>
                  <input type="text" placeholder="Ex: [0.4, 1.1, 3.1, ...]" value={fsrsWeights} onChange={e => setFsrsWeights(e.target.value)} className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm text-dark-text font-mono focus:outline-none focus:border-indigo-500 transition-colors hover:border-white/20" />
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-white/10">
                  <div className="flex flex-col gap-2">
                    <button onClick={handleResetProgress} className="text-orange-400 hover:text-orange-300 text-sm font-medium text-left">Resetar Progresso (FSRS)</button>
                    <button onClick={handleDeleteDeck} className="text-red-400 hover:text-red-300 text-sm font-medium text-left">Excluir Baralho Inteiro</button>
                  </div>
                  <button onClick={handleUpdateDeck} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg">Salvar Alterações</button>
                </div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="p-4 border-b border-white/5 flex flex-wrap justify-between items-center gap-4 bg-transparent">
            <div className="flex flex-wrap items-center gap-3 flex-1">
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
            </div>
            
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 border-r border-white/10 pr-3">
                  <span className="text-sm text-indigo-400 font-medium">{selectedIds.size} selecionados</span>
                  <button onClick={handleDeleteSelected} className="flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded text-sm transition-colors">
                    <Trash2 size={16} /> Excluir
                  </button>
                </div>
              )}
              
              <button 
                onClick={() => setIsCreatingCard(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              >
                Novo Cartão
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="text-center py-12 text-dark-subtext">Carregando cartões...</div>
            ) : filteredCards.length === 0 ? (
              <div className="text-center py-12 text-dark-subtext">Nenhum cartão encontrado neste baralho.</div>
            ) : (
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
                  {filteredCards.map(card => (
                    <tr key={card.id} className="hover:bg-dark-card transition-colors group">
                      <td className="p-3">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(card.id)}
                          onChange={() => toggleSelect(card.id)}
                          className="rounded border-dark-border bg-dark-bg text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-3 text-sm text-dark-text max-w-xs truncate" dangerouslySetInnerHTML={{ __html: card.front }}></td>
                      <td className="p-3 text-sm text-dark-subtext max-w-xs truncate" dangerouslySetInnerHTML={{ __html: card.back }}></td>
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
                          <button onClick={() => setEditingCard(card)} className="p-1.5 text-dark-subtext hover:text-indigo-400 hover:bg-white/10 rounded" title="Editar">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDeleteCard(card.id)} className="p-1.5 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded" title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

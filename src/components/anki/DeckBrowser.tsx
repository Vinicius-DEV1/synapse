import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, Edit3, Settings, Volume2, HardDrive } from 'lucide-react';
import CardEditor from './CardEditor';

interface DeckBrowserProps {
  deck: any;
  onClose: () => void;
  onDeckDeleted: () => void;
}

export default function DeckBrowser({ deck, onClose, onDeckDeleted }: DeckBrowserProps) {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [editingCard, setEditingCard] = useState<any | null>(null);
  
  // Deck settings mode
  const [showSettings, setShowSettings] = useState(false);
  const [deckName, setDeckName] = useState(deck.name);
  const [deckDesc, setDeckDesc] = useState(deck.description || '');

  useEffect(() => {
    loadCards();
  }, [deck.id]);

  const loadCards = async () => {
    setLoading(true);
    if (window.api?.anki) {
      const res = await window.api.anki.getAllCards(deck.id);
      if (res.success && res.cards) {
        setCards(res.cards);
      }
    }
    setLoading(false);
  };

  const filteredCards = cards.filter(c => 
    c.front.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.back.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      setShowSettings(false);
      deck.name = deckName;
      deck.description = deckDesc;
    }
  };

  const handleDeleteDeck = async () => {
    if (!window.confirm(`ATENÇÃO! Tem certeza que deseja excluir o baralho "${deck.name}" e TODOS os seus cartões?`)) return;
    if (window.api?.anki) {
      await window.api.anki.deleteDeck(deck.id);
      onDeckDeleted();
    }
  };

  const playAudio = (url: string) => {
    const audio = new Audio(url);
    audio.play().catch(e => console.error("Audio error:", e));
  };

  if (editingCard) {
    return (
      <CardEditor
        draft={{
          front: editingCard.front.replace(/<\/?b>/g, ''),
          back: editingCard.back.replace(/<\/?b>/g, ''),
          extra_note: editingCard.extra_note,
          media_url: editingCard.media_url,
          card_type: editingCard.card_type,
          source_module: editingCard.source_module,
          source_id: editingCard.source_id
        }}
        editingCardId={editingCard.id}
        onClose={() => {
          setEditingCard(null);
          loadCards();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-dark-surface w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-dark-border h-[90vh]">
        
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
            <div className="absolute top-0 left-0 right-0 bg-dark-surface p-8 border-b border-white/5 z-10 animate-fade-in shadow-2xl">
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
                <div className="flex justify-between pt-4">
                  <button onClick={handleDeleteDeck} className="text-red-400 hover:text-red-300 text-sm font-medium">Excluir Baralho Inteiro</button>
                  <button onClick={handleUpdateDeck} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm transition-colors">Salvar Alterações</button>
                </div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="p-4 border-b border-white/5 flex justify-between items-center bg-transparent">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-subtext" />
              <input 
                type="text" 
                placeholder="Buscar cartões..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-surface border border-white/5 rounded-xl text-sm text-dark-text focus:outline-none focus:border-white/10 transition-all placeholder-dark-subtext/50"
              />
            </div>
            
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-indigo-400 font-medium">{selectedIds.size} selecionados</span>
                <button onClick={handleDeleteSelected} className="flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-3 py-1.5 rounded text-sm transition-colors">
                  <Trash2 size={16} /> Excluir
                </button>
              </div>
            )}
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
                    <tr key={card.id} className="hover:bg-dark-surface transition-colors group">
                      <td className="p-3">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(card.id)}
                          onChange={() => toggleSelect(card.id)}
                          className="rounded border-dark-border bg-dark-bg text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-3 text-sm text-dark-text max-w-xs truncate" dangerouslySetInnerHTML={{ __html: card.front.replace(/<\/?b>/g, '') }}></td>
                      <td className="p-3 text-sm text-dark-subtext max-w-xs truncate" dangerouslySetInnerHTML={{ __html: card.back.replace(/<\/?b>/g, '') }}></td>
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

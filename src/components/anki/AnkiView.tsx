import React, { useEffect, useState } from 'react';
import { Plus, Play, BrainCircuit, Settings } from 'lucide-react';
import StudySession from './StudySession';
import DeckBrowser from './DeckBrowser';

export default function AnkiView() {
  const [decks, setDecks] = useState<any[]>([]);
  const [studyingDeckId, setStudyingDeckId] = useState<string | null>(null);
  const [managingDeck, setManagingDeck] = useState<any | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    if (window.api?.anki) {
      const res = await window.api.anki.getDecks();
      if (res.success && res.decks) setDecks(res.decks);
    }
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return;
    if (window.api?.anki) {
      await window.api.anki.createDeck(newDeckName, newDeckDesc);
      setShowCreateModal(false);
      setNewDeckName('');
      setNewDeckDesc('');
      loadDecks();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-dark-bg text-dark-text p-8 overflow-y-auto relative" style={{ height: '100dvh' }}>
      <div className="max-w-5xl mx-auto w-full space-y-8">
        <header className="flex justify-between items-center pb-8 border-b border-white/5">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BrainCircuit className="w-8 h-8 text-indigo-500" />
              Flashcards
            </h1>
            <p className="text-dark-subtext mt-2">FSRS Spaced Repetition System</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Baralho
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map(deck => (
            <div key={deck.id} className="bg-dark-card p-6 rounded-2xl border border-white/5 flex flex-col cursor-pointer hover:border-indigo-500/50 hover:shadow-lg transition-all duration-300 group">
              <h3 className="text-xl font-semibold mb-2 text-white/90 group-hover:text-white transition-colors">{deck.name}</h3>
              <p className="text-dark-subtext text-sm flex-1 leading-relaxed">{deck.description}</p>
              
              <div className="mt-8 flex justify-between items-center">
                <div className="flex gap-4 text-sm font-medium">
                  <div className="text-blue-400/80" title="Novos Cartões">0</div>
                  <div className="text-orange-400/80" title="Para Revisar">0</div>
                  <div className="text-green-400/80" title="Revisões Feitas">0</div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setManagingDeck(deck)}
                    className="flex items-center justify-center bg-dark-bg hover:bg-white/5 border border-white/5 p-2 rounded-xl transition-colors text-dark-subtext hover:text-white"
                    title="Gerenciar Baralho (Cards, Opções)"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setStudyingDeckId(deck.id)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-sm transition-all shadow-lg shadow-indigo-900/20 font-medium"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    Estudar
                  </button>
                </div>
              </div>
            </div>
          ))}

          {decks.length === 0 && (
            <div className="col-span-full py-12 text-center text-dark-subtext">
              Nenhum baralho encontrado. Crie um baralho para começar.
            </div>
          )}
        </div>
      </div>
      
      {studyingDeckId && (
        <StudySession deckId={studyingDeckId} onClose={() => setStudyingDeckId(null)} />
      )}

      {managingDeck && (
        <DeckBrowser 
          deck={managingDeck} 
          onClose={() => setManagingDeck(null)} 
          onDeckDeleted={() => {
            setManagingDeck(null);
            loadDecks();
          }} 
          onDeckUpdated={(updatedDeck) => {
            setManagingDeck(updatedDeck);
            loadDecks();
          }}
        />
      )}

      {showCreateModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-dark-card border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Novo Baralho</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-dark-subtext mb-1">Nome do Baralho</label>
                <input 
                  type="text" 
                  value={newDeckName} 
                  onChange={e => setNewDeckName(e.target.value)} 
                  autoFocus
                  placeholder="Ex: Inglês - Phrasal Verbs"
                  className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark-subtext mb-1">Descrição (opcional)</label>
                <input 
                  type="text" 
                  value={newDeckDesc} 
                  onChange={e => setNewDeckDesc(e.target.value)} 
                  placeholder="Ex: Verbos úteis para conversação"
                  className="w-full bg-dark-bg border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateDeck}
                disabled={!newDeckName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-medium transition-colors"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

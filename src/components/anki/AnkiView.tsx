import React, { useEffect, useState } from 'react';
import { Plus, Play, BrainCircuit, Settings } from 'lucide-react';
import StudySession from './StudySession';
import DeckBrowser from './DeckBrowser';

export default function AnkiView() {
  const [decks, setDecks] = useState<any[]>([]);
  const [studyingDeckId, setStudyingDeckId] = useState<string | null>(null);
  const [managingDeck, setManagingDeck] = useState<any | null>(null);

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    if (window.api?.anki) {
      const res = await window.api.anki.getDecks();
      if (res.success && res.decks) setDecks(res.decks);
    }
  };

  const handleCreateDefaultDeck = async () => {
    if (window.api?.anki) {
      await window.api.anki.createDeck('Vocabulário Geral', 'Baralho principal para idiomas');
      loadDecks();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-dark-bg text-dark-text p-8 overflow-y-auto" style={{ height: '100dvh' }}>
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
            onClick={handleCreateDefaultDeck}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Criar Baralho
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map(deck => (
            <div key={deck.id} className="bg-white/5 p-6 rounded-2xl ring-1 ring-white/5 flex flex-col cursor-pointer hover:bg-white/10 hover:ring-indigo-500/50 transition-all duration-300 group">
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
                    className="flex items-center justify-center bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors text-dark-subtext hover:text-white"
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
        />
      )}
    </div>
  );
}

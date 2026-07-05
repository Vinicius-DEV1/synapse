import React, { useEffect, useState } from 'react';
import { Plus, Play, BrainCircuit } from 'lucide-react';

export default function AnkiView() {
  const [decks, setDecks] = useState<any[]>([]);

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
        <header className="flex justify-between items-center border-b border-dark-border pb-6">
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
            <div key={deck.id} className="bg-dark-surface p-6 rounded-xl border border-dark-border shadow-lg flex flex-col cursor-pointer hover:border-indigo-500 transition-colors">
              <h3 className="text-xl font-semibold mb-2">{deck.name}</h3>
              <p className="text-dark-subtext text-sm flex-1">{deck.description}</p>
              
              <div className="mt-6 flex justify-between items-center">
                <div className="flex gap-4 text-sm font-medium">
                  <div className="text-blue-400" title="Novos Cartões">0</div>
                  <div className="text-orange-400" title="Para Revisar">0</div>
                  <div className="text-green-400" title="Revisões Feitas">0</div>
                </div>
                
                <button className="flex items-center gap-2 bg-dark-bg hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded text-sm transition-colors border border-dark-border">
                  <Play className="w-4 h-4" />
                  Estudar
                </button>
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
    </div>
  );
}

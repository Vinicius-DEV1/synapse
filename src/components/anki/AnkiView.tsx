import { useEffect, useState, useMemo } from 'react';
import { Plus, BrainCircuit, HelpCircle, BarChart2 } from 'lucide-react';
import StudySession from './StudySession';
import DeckBrowser from './DeckBrowser';
import AnkiStats from './AnkiStats';
import CreateDeckModal from './CreateDeckModal';
import AnkiHelpModal from './AnkiHelpModal';
import { DeckListItem } from './DeckListItem';
import type { Deck, DeckTreeNode } from './types';

export default function AnkiView() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [studyingDeckId, setStudyingDeckId] = useState<string | null>(null);
  const [managingDeck, setManagingDeck] = useState<Deck | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [parentDeckId, setParentDeckId] = useState<string | null>(null);
  const [deckStats, setDeckStats] = useState<Record<string, { novos: number, aprender: number, revisar: number }>>({});
  
  const [collapsedDecks, setCollapsedDecks] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('anki_collapsed_decks');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const toggleDeckCollapse = (deckId: string) => {
    setCollapsedDecks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deckId)) newSet.delete(deckId);
      else newSet.add(deckId);
      localStorage.setItem('anki_collapsed_decks', JSON.stringify(Array.from(newSet)));
      return newSet;
    });
  };

  useEffect(() => {
    const init = async () => {
      if (window.api?.anki?.migrateToNotes) {
         try { await window.api.anki.migrateToNotes(); } catch (e) { console.error('Migration error', e); }
      }
      loadDecks();
    };
    init();
  }, []);

  const loadDecks = async () => {
    try {
      if (window.api?.anki) {
        const res = await window.api.anki.getDecks();
        let loadedDecks = [];
        if (res.success && res.decks) {
          loadedDecks = res.decks;
        } else if (Array.isArray(res)) {
          loadedDecks = res;
        }
        setDecks(loadedDecks);
        loadStats(loadedDecks);
      }
    } catch (err) {
      console.error('[Flashcards] Failed to load decks:', err);
    }
  };

  const loadStats = async (decksToLoad: any[]) => {
    const ankiApi = window.api?.anki;
    if (!ankiApi || !decksToLoad?.length) return;
    const stats: Record<string, any> = {};
    await Promise.all(
      decksToLoad.map(async (d) => {
        try {
          const dueRes = await ankiApi.getDueCards(d.id);
          let dueCards: any[] = [];
          if (dueRes && dueRes.success && dueRes.cards) dueCards = dueRes.cards;
          else if (Array.isArray(dueRes)) dueCards = dueRes;

          let novos = 0;
          let aprender = 0;
          let revisar = 0;

          dueCards.forEach((c: any) => {
            const state = Number(c.state) || 0;
            if (state === 0) novos++;
            else if (state === 1 || state === 3) aprender++;
            else if (state === 2) revisar++;
          });

          stats[d.id] = { novos, aprender, revisar };
        } catch (err) {
          console.warn('Failed to load stats for deck', d.id, err);
          stats[d.id] = { novos: 0, aprender: 0, revisar: 0 };
        }
      })
    );
    setDeckStats(stats);
  };

  const handleCreateDeck = async (name: string, description: string, parentId: string | null) => {
    if (window.api?.anki) {
      try {
        await window.api.anki.createDeck(name, description, parentId || undefined);
        setShowCreateModal(false);
        setParentDeckId(null);
        await loadDecks();
      } catch (err) {
        console.error('[Flashcards] Failed to create deck:', err);
      }
    }
  };

  const handleCreateSubDeck = (deckId: string) => {
    setParentDeckId(deckId);
    setShowCreateModal(true);
  };

  // Build tree structure from flat deck list
  const buildDeckTree = (flatDecks: Deck[], parentId: string | null = null): DeckTreeNode[] => {
    return flatDecks
      .filter((deck) => (deck.parent_id || null) === parentId)
      .map((deck) => ({
        ...deck,
        children: buildDeckTree(flatDecks, deck.id)
      }));
  };

  const deckTree = useMemo(() => buildDeckTree(decks), [decks]);

  return (
    <div className="flex-1 flex flex-col bg-dark-bg text-dark-text p-8 overflow-y-auto relative" style={{ height: '100dvh' }}>
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {!showStats && (
          <header className="flex justify-between items-center pb-8 border-b border-white/5">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <BrainCircuit className="w-8 h-8 text-indigo-500" />
                Flashcards
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-dark-subtext">FSRS Spaced Repetition System</p>
                <button 
                  onClick={() => setShowHelpModal(true)}
                  className="text-dark-subtext hover:text-indigo-400 transition-colors p-1 rounded-full hover:bg-white/5 flex items-center justify-center cursor-pointer"
                  title="Como funciona o algoritmo?"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowStats(true)}
                className="flex items-center gap-2 bg-dark-card hover:bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <BarChart2 className="w-4 h-4 text-indigo-400" />
                Estatísticas
              </button>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Criar Baralho
              </button>
            </div>
          </header>
        )}

        {!showStats ? (
          <div className="flex flex-col w-full pb-20">
            {deckTree.length > 0 && (
              <div className="flex items-center justify-between px-4 pb-2 text-xs font-semibold text-dark-subtext uppercase tracking-wider border-b border-white/5 mb-2">
              <span>Baralho</span>
              <div className="flex gap-16 mr-[200px]">
                <span>Estatísticas</span>
                <span>Ações</span>
              </div>
            </div>
          )}

          {deckTree.map((deck) => (
            <DeckListItem
              key={deck.id}
              deck={deck}
              collapsedDecks={collapsedDecks}
              toggleDeckCollapse={toggleDeckCollapse}
              deckStats={deckStats}
              onCreateSubDeck={handleCreateSubDeck}
              onManageDeck={setManagingDeck}
              onStudyDeck={setStudyingDeckId}
            />
          ))}

          {deckTree.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-dark-subtext bg-dark-card border border-white/5 rounded-2xl">
              <BrainCircuit className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">Nenhum baralho encontrado</p>
              <p className="text-sm mt-1">Crie um baralho para começar a estudar.</p>
            </div>
          )}
        </div>
      ) : (
        <AnkiStats onBack={() => setShowStats(false)} />
      )}
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
        <CreateDeckModal 
          parentId={parentDeckId} 
          onClose={() => {
            setShowCreateModal(false);
            setParentDeckId(null);
          }} 
          onCreate={handleCreateDeck} 
        />
      )}

      {showHelpModal && (
        <AnkiHelpModal onClose={() => setShowHelpModal(false)} />
      )}
    </div>
  );
}

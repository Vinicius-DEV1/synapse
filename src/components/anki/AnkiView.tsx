import { useEffect, useState } from 'react';
import { Play, Plus, Trash2, Edit3, Settings, BrainCircuit, X, Layers } from 'lucide-react';
import StudySession from './StudySession';
import DeckBrowser from './DeckBrowser';

export default function AnkiView() {
  const [decks, setDecks] = useState<any[]>([]);
  const [studyingDeckId, setStudyingDeckId] = useState<string | null>(null);
  const [managingDeck, setManagingDeck] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [parentDeckId, setParentDeckId] = useState<string | null>(null);
  const [deckStats, setDeckStats] = useState<Record<string, { novos: number, revisar: number, feitas: number }>>({});

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
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
  };

  const loadStats = async (decksToLoad: any[]) => {
    if (!window.api?.anki) return;
    const stats: Record<string, any> = {};
    for (const d of decksToLoad) {
      try {
        const dueRes = await window.api.anki.getDueCards(d.id);
        let dueCards = [];
        if (dueRes && dueRes.success && dueRes.cards) dueCards = dueRes.cards;
        else if (Array.isArray(dueRes)) dueCards = dueRes;

        const allRes = await window.api.anki.getAllCards(d.id);
        let allCards = [];
        if (allRes && allRes.success && allRes.cards) allCards = allRes.cards;
        else if (Array.isArray(allRes)) allCards = allRes;

        const novos = allCards.filter((c: any) => c.state === 0 || c.state === 'new' || c.srs_state === null || c.srs_state === undefined || c.state === undefined).length;
        const revisar = dueCards.length;
        const feitas = allCards.length - novos - revisar;

        stats[d.id] = { novos, revisar, feitas: feitas > 0 ? feitas : 0 };
      } catch (err) {
        console.warn('Failed to load stats for deck', d.id, err);
        stats[d.id] = { novos: 0, revisar: 0, feitas: 0 };
      }
    }
    setDeckStats(stats);
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return;
    if (window.api?.anki) {
      // @ts-ignore - createDeck accepts optional parentId parameter
      await window.api.anki.createDeck(newDeckName, newDeckDesc, parentDeckId);
      setShowCreateModal(false);
      setNewDeckName('');
      setNewDeckDesc('');
      setParentDeckId(null);
      loadDecks();
    }
  };

  const handleCreateSubDeck = (deckId: string) => {
    setParentDeckId(deckId);
    setShowCreateModal(true);
  };

  // Build tree structure from flat deck list
  const buildDeckTree = (flatDecks: any[], parentId: string | null = null): any[] => {
    return flatDecks
      .filter((deck: any) => deck.parent_id === parentId)
      .map((deck: any) => ({
        ...deck,
        children: buildDeckTree(flatDecks, deck.id)
      }));
  };

  const deckTree = buildDeckTree(decks);

  const renderDeckCard = (deck: any, depth: number = 0) => (
    <div key={deck.id} className="flex flex-col w-full">
      <div
        className="bg-dark-card p-4 rounded-xl border border-white/5 flex items-center justify-between cursor-pointer hover:border-indigo-500/50 hover:bg-white/5 transition-all duration-300 group"
        style={{ marginLeft: `${depth * 24}px`, marginTop: depth > 0 ? '8px' : '16px' }}
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-3">
            <Layers className="text-indigo-400 shrink-0" size={20} />
            <h3 className="text-lg font-semibold text-white/90 group-hover:text-white transition-colors truncate">{deck.name}</h3>
          </div>
          {deck.description && (
            <p className="text-dark-subtext text-xs mt-1 truncate pl-8">{deck.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-6 shrink-0">
          <div className="flex gap-3 text-xs font-medium bg-dark-bg px-3 py-1.5 rounded-lg border border-white/5">
            <div className="text-blue-400/80 flex items-center gap-1" title="Novos Cartões">
              <span className="w-2 h-2 rounded-full bg-blue-400/50"></span>
              {deckStats[deck.id]?.novos || 0}
            </div>
            <div className="text-orange-400/80 flex items-center gap-1" title="Para Revisar">
              <span className="w-2 h-2 rounded-full bg-orange-400/50"></span>
              {deckStats[deck.id]?.revisar || 0}
            </div>
            <div className="text-green-400/80 flex items-center gap-1" title="Revisões Feitas/Aprendizado">
              <span className="w-2 h-2 rounded-full bg-green-400/50"></span>
              {deckStats[deck.id]?.feitas || 0}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleCreateSubDeck(deck.id); }}
              className="flex items-center justify-center p-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-colors"
              title="Criar Subbaralho"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setManagingDeck(deck)}
              className="flex items-center justify-center p-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/10 transition-colors"
              title="Gerenciar Baralho"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setStudyingDeckId(deck.id)}
              className="flex items-center gap-2 bg-indigo-600/90 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-sm transition-all font-medium"
            >
              <Play className="w-3 h-3 fill-white" />
              Estudar
            </button>
          </div>
        </div>
      </div>
      {deck.children && deck.children.length > 0 && deck.children.map((child: any) => renderDeckCard(child, depth + 1))}
    </div>
  );

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

          {deckTree.map((deck: any) => renderDeckCard(deck))}

          {deckTree.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-dark-subtext bg-dark-card border border-white/5 rounded-2xl">
              <BrainCircuit className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">Nenhum baralho encontrado</p>
              <p className="text-sm mt-1">Crie um baralho para começar a estudar.</p>
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
            <h2 className="text-xl font-bold mb-4">{parentDeckId ? 'Novo Subbaralho' : 'Novo Baralho'}</h2>

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
                onClick={() => {
                  setShowCreateModal(false);
                  setParentDeckId(null);
                }}
                className="px-4 py-2 rounded-lg text-dark-subtext hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateDeck}
                disabled={!newDeckName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg font-medium transition-colors"
              >
                {parentDeckId ? 'Criar Subbaralho' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

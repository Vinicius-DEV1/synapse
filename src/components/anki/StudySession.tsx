import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, X, Volume2, Edit3, Trash2 } from 'lucide-react';
import CardEditor from './CardEditor';

interface Card {
  id: string;
  front: string;
  back: string;
  media_url?: string;
  card_type: 'reading' | 'listening' | 'typing' | 'cloze';
  validation_mode?: 'exact' | 'ai';
  state: number;
  extra_note?: string;
  source_module?: string;
  source_id?: string;
}

export default function StudySession({ deckId, onClose }: { deckId: string; onClose: () => void }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{verdict: string, feedback: string} | null>(null);
  const [exactMatch, setExactMatch] = useState<boolean | null>(null);

  useEffect(() => {
    loadDueCards();
  }, [deckId]);

  const loadDueCards = async () => {
    setLoading(true);
    if (window.api?.anki) {
      const res = await window.api.anki.getDueCards(deckId);
      if (res.success && res.cards) {
        setCards(res.cards);
        setCurrentIndex(0);
        setShowingAnswer(false);
        resetCardState();
      }
    }
    setLoading(false);
  };

  const resetCardState = () => {
    setTypedAnswer('');
    setEvaluating(false);
    setAiFeedback(null);
    setExactMatch(null);
  };

  const handleDeleteCard = async () => {
    const card = cards[currentIndex];
    if (!card) return;
    if (window.confirm('Tem certeza que deseja excluir este cartão definitivamente?')) {
      if (window.api?.anki) {
        await window.api.anki.deleteCard(card.id);
        loadDueCards();
      }
    }
  };

  const handleRating = async (rating: number) => {
    const card = cards[currentIndex];
    if (window.api?.anki) {
      await window.api.anki.reviewCard(card.id, rating);
    }
    
    // Move to next card
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(curr => curr + 1);
      setShowingAnswer(false);
      resetCardState();
    } else {
      // Done
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
         onClose();
         return;
      }
      
      if (!showingAnswer) {
        const card = cards[currentIndex];
        if (card && (card.card_type === 'typing' || card.card_type === 'cloze')) {
           // Em typing e cloze, Enter é lidado pelo form. Espaço digita espaço.
           return;
        }
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          setShowingAnswer(true);
        }
      } else {
        if (e.key === '1') handleRating(1);
        if (e.key === '2') handleRating(2);
        if (e.key === '3') handleRating(3);
        if (e.key === '4') handleRating(4);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showingAnswer, currentIndex, cards]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = () => {
    const card = cards[currentIndex];
    if (card?.media_url) {
      if (!audioRef.current || !audioRef.current.src.endsWith(encodeURI(card.media_url).replace(/%20/g, ' '))) {
        if (audioRef.current) audioRef.current.pause();
        audioRef.current = new Audio(card.media_url);
      }
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
  };

  // Auto-play audio when card appears if it's a listening card
  useEffect(() => {
    if (!loading && cards[currentIndex]) {
       const card = cards[currentIndex];
       if (card.card_type === 'listening' && !showingAnswer) {
          playAudio();
        } else if (showingAnswer && card.media_url && card.card_type !== 'listening') {
          playAudio();
       }
    }
  }, [currentIndex, showingAnswer, loading]);

  const handleAnswerSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedAnswer.trim()) {
        setShowingAnswer(true);
        return;
    }

    let expected = card.back;
    if (card.card_type === 'cloze') {
        const match = card.front.match(/\{\{(.*?)\}\}/);
        if (match) expected = match[1];
    }

    if (card.validation_mode === 'ai') {
        setEvaluating(true);
        console.log(`[Flashcards] Iniciando validação por IA...`);
        console.log(`[Flashcards] Resposta Esperada: "${expected}" | Resposta Digitada: "${typedAnswer}"`);
        try {
            const { promptGeminiForAnkiEvaluation } = await import('../../services/gemini');
            const res = await promptGeminiForAnkiEvaluation(card.front, expected, typedAnswer);
            console.log(`[Flashcards] IA retornou:`, res);
            setAiFeedback(res as any);
        } catch (err) {
            console.error(`[Flashcards] Falha na IA:`, err);
            setAiFeedback({ verdict: 'Incorreto', feedback: 'Erro de IA. Avalie manualmente.' });
        }
        setEvaluating(false);
    } else {
        setExactMatch(typedAnswer.trim().toLowerCase() === expected.trim().toLowerCase());
    }
    setShowingAnswer(true);
  };

  if (editingCard) {
    return (
      <CardEditor
        draft={{
          front: editingCard.front,
          back: editingCard.back,
          extra_note: editingCard.extra_note,
          media_url: editingCard.media_url,
          card_type: editingCard.card_type,
          validation_mode: editingCard.validation_mode,
          source_module: editingCard.source_module,
          source_id: editingCard.source_id
        }}
        editingCardId={editingCard.id}
        onClose={() => {
          setEditingCard(null);
          loadDueCards();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="absolute inset-0 bg-dark-bg flex items-center justify-center text-dark-text z-50">
        <p className="animate-pulse flex items-center gap-2">
          <RotateCcw className="w-5 h-5 animate-spin" />
          Preparando sessão...
        </p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="absolute inset-0 bg-dark-bg flex flex-col items-center justify-center text-dark-text z-50">
        <h2 className="text-2xl font-bold mb-4">Parabéns! 🎉</h2>
        <p className="text-dark-subtext mb-8">Você não tem cartões pendentes neste baralho agora.</p>
        <button onClick={onClose} className="px-6 py-2 bg-indigo-600 rounded-lg font-medium hover:bg-indigo-700">
          Voltar
        </button>
      </div>
    );
  }

  const card = cards[currentIndex];

  return (
    <div className="absolute inset-0 bg-dark-bg flex flex-col z-50 select-text">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8">
        <div className="flex items-center gap-4 text-sm font-medium">
           <span className="text-dark-subtext">Cartão {currentIndex + 1} de {cards.length}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditingCard(cards[currentIndex])} className="p-2 text-dark-subtext hover:text-indigo-400 hover:bg-white/5 rounded-lg transition-colors" title="Editar Cartão">
            <Edit3 className="w-5 h-5" />
          </button>
          <button onClick={handleDeleteCard} className="p-2 text-dark-subtext hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors" title="Excluir Cartão">
            <Trash2 className="w-5 h-5" />
          </button>
          <button onClick={onClose} className="p-2 text-dark-subtext hover:text-dark-text hover:bg-white/5 rounded-lg transition-colors" title="Fechar Sessão">
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Card Area */}
      <main className="flex-1 flex flex-col p-6 sm:p-12 pb-24 sm:pb-32 overflow-y-auto">
        <div className="m-auto w-full max-w-2xl flex flex-col items-center gap-8 shrink-0">
          <div className="w-full bg-dark-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden flex flex-col min-h-[400px]">
          
          {/* Front */}
          <div className="flex-1 p-10 flex flex-col items-center justify-center text-center relative">
            {card.card_type === 'listening' ? (
              <button 
                onClick={playAudio}
                className="w-24 h-24 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center hover:bg-indigo-500/20 hover:scale-105 transition-all duration-300 cursor-pointer shadow-[0_0_30px_rgba(99,102,241,0.1)]"
              >
                <Volume2 className="w-10 h-10" />
              </button>
            ) : card.card_type === 'cloze' ? (
                <div className="text-3xl font-medium leading-relaxed text-dark-text text-center" style={{ lineHeight: '1.8' }}>
                    {card.front.replace(/<\/?p[^>]*>/gi, '').split(/\{\{(.*?)\}\}/).map((part, i) => {
                        if (i % 2 === 1) { // cloze word
                            if (!showingAnswer) {
                                return (
                                   <form onSubmit={handleAnswerSubmit} key={i} className="inline-block align-middle mx-1">
                                     <input 
                                       autoFocus
                                       type="text" 
                                       value={typedAnswer}
                                       onChange={e => setTypedAnswer(e.target.value)}
                                       className="bg-transparent border-b-2 border-indigo-500 focus:outline-none focus:border-indigo-400 text-center text-indigo-400 pb-1 max-w-full"
                                       style={{ width: `${Math.max(5, typedAnswer.length + 1)}ch` }} 
                                     />
                                   </form>
                                );
                            } else {
                                if (card.validation_mode === 'exact') {
                                    return (
                                        <span key={i} className={`font-bold border-b-2 pb-1 px-2 mx-1 ${exactMatch ? 'text-green-400 border-green-500' : 'text-red-400 border-red-500'}`}>
                                            {typedAnswer || '___'}
                                        </span>
                                    );
                                } else {
                                    return (
                                        <span key={i} className="text-indigo-400 font-bold border-b-2 border-indigo-500 pb-1 px-2 mx-1">
                                            {typedAnswer || '___'}
                                        </span>
                                    );
                                }
                            }
                        } else {
                            return <span key={i} dangerouslySetInnerHTML={{__html: part}} />;
                        }
                    })}
                </div>
            ) : (
              <>
                <div 
                  className="text-3xl font-medium leading-relaxed text-dark-text"
                  dangerouslySetInnerHTML={{ __html: card.front }} 
                />
                {card.card_type === 'typing' && !showingAnswer && (
                    <form onSubmit={handleAnswerSubmit} className="mt-8 w-full max-w-sm">
                        <input 
                            autoFocus
                            type="text"
                            value={typedAnswer}
                            onChange={e => setTypedAnswer(e.target.value)}
                            placeholder="Digite a resposta..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-xl text-white focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                    </form>
                )}
                {card.card_type === 'typing' && showingAnswer && card.validation_mode === 'exact' && (
                    <div className={`mt-8 px-6 py-3 rounded-xl border ${exactMatch ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'} text-xl font-medium`}>
                        Sua resposta: {typedAnswer || 'Em branco'}
                    </div>
                )}
                {card.card_type === 'typing' && showingAnswer && card.validation_mode === 'ai' && (
                    <div className={`mt-8 px-6 py-3 rounded-xl border bg-indigo-500/10 border-indigo-500/30 text-indigo-400 text-xl font-medium`}>
                        Sua resposta: {typedAnswer || 'Em branco'}
                    </div>
                )}
              </>
            )}

            {evaluating && (
                <div className="absolute inset-0 bg-dark-bg/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-t-2xl z-10">
                    <p className="text-indigo-300 font-medium animate-pulse">IA analisando sua resposta...</p>
                </div>
            )}
          </div>

          {/* Divider */}
          {showingAnswer && <div className="h-px w-full bg-white/5" />}

          {/* Back */}
          {showingAnswer && (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-dark-card animate-in fade-in slide-in-from-bottom-4 duration-300">
              {aiFeedback && (
                  <div className={`mb-6 w-full max-w-md p-4 rounded-xl border ${
                      aiFeedback.verdict === 'Correto' ? 'bg-green-500/10 border-green-500/30 text-green-300' :
                      aiFeedback.verdict === 'Parcial' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' :
                      'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}>
                      <div className="flex items-center justify-center gap-2 mb-1">
                          <span className="font-bold text-lg">IA: {aiFeedback.verdict}</span>
                      </div>
                      <p className="text-sm opacity-90">{aiFeedback.feedback}</p>
                  </div>
              )}

              {card.card_type === 'cloze' && card.validation_mode === 'exact' && !exactMatch && (
                  <div className="mb-4 text-green-400 font-medium bg-green-500/10 px-4 py-2 rounded-lg">Resposta Esperada: {card.front.match(/\{\{(.*?)\}\}/)?.[1]}</div>
              )}

              {card.card_type === 'typing' && card.validation_mode === 'exact' && !exactMatch && (
                  <div className="mb-4 text-green-400 font-medium bg-green-500/10 px-4 py-2 rounded-lg">Resposta Esperada: {card.back}</div>
              )}

              {card.card_type === 'listening' && (
                <div 
                  className="text-lg text-dark-text font-medium mb-4"
                  dangerouslySetInnerHTML={{ __html: card.front }}
                />
              )}
              {card.card_type === 'cloze' ? (
                card.back && card.back.trim() !== '' && (
                  <div className="mt-4 flex flex-col items-center">
                    <span className="text-xs text-dark-subtext uppercase tracking-wider mb-2 font-bold bg-white/5 px-3 py-1 rounded-full">Notas</span>
                    <div 
                      className="text-base text-dark-subtext whitespace-pre-wrap leading-relaxed max-w-lg bg-dark-bg p-4 rounded-xl border border-white/5"
                      dangerouslySetInnerHTML={{ __html: card.back }}
                    />
                  </div>
                )
              ) : (
                <div 
                  className="text-base text-dark-subtext whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: card.back }}
                />
              )}
              {card.media_url && (
                <button onClick={playAudio} className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm">
                   <Volume2 className="w-4 h-4" /> Ouvir Novamente
                </button>
              )}
            </div>
          )}

        </div>

        {/* Controls */}
        <div className="w-full max-w-2xl flex justify-center mt-2">
          {!showingAnswer ? (
            <button 
              onClick={() => setShowingAnswer(true)}
              className="px-12 py-4 bg-dark-card border border-white/10 rounded-xl text-base font-medium hover:bg-white/5 hover:border-indigo-500/50 transition-all duration-300 w-full max-w-md shadow-lg hover:shadow-xl"
            >
              Mostrar Resposta <span className="ml-2 text-dark-subtext text-sm">(Espaço)</span>
            </button>
          ) : (
            <div className="flex gap-4 w-full px-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <button onClick={() => handleRating(1)} className="flex-1 py-3 px-2 rounded-xl bg-dark-card hover:bg-white/5 text-red-400 border border-white/5 hover:border-red-500/30 font-medium flex flex-col items-center justify-center gap-1 transition-all duration-300 shadow-lg hover:shadow-xl">
                <span>Errei</span>
                <span className="text-xs opacity-50 font-normal">Again (1)</span>
              </button>
              <button onClick={() => handleRating(2)} className="flex-1 py-3 px-2 rounded-xl bg-dark-card hover:bg-white/5 text-orange-400 border border-white/5 hover:border-orange-500/30 font-medium flex flex-col items-center justify-center gap-1 transition-all duration-300 shadow-lg hover:shadow-xl">
                <span>Difícil</span>
                <span className="text-xs opacity-50 font-normal">Hard (2)</span>
              </button>
              <button onClick={() => handleRating(3)} className="flex-1 py-3 px-2 rounded-xl bg-dark-card hover:bg-white/5 text-green-400 border border-white/5 hover:border-green-500/30 font-medium flex flex-col items-center justify-center gap-1 transition-all duration-300 shadow-lg hover:shadow-xl">
                <span>Bom</span>
                <span className="text-xs opacity-50 font-normal">Good (3)</span>
              </button>
              <button onClick={() => handleRating(4)} className="flex-1 py-3 px-2 rounded-xl bg-dark-card hover:bg-white/5 text-blue-400 border border-white/5 hover:border-blue-500/30 font-medium flex flex-col items-center justify-center gap-1 transition-all duration-300 shadow-lg hover:shadow-xl">
                <span>Fácil</span>
                <span className="text-xs opacity-50 font-normal">Easy (4)</span>
              </button>
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  );
}

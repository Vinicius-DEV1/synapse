import React, { useState, useEffect, useRef } from 'react';
import { Play, RotateCcw, X, Volume2 } from 'lucide-react';

interface Card {
  id: string;
  front: string;
  back: string;
  media_url?: string;
  card_type: 'reading' | 'listening';
  state: number;
}

export default function StudySession({ deckId, onClose }: { deckId: string; onClose: () => void }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDueCards();
  }, [deckId]);

  const loadDueCards = async () => {
    setLoading(true);
    if (window.api?.anki) {
      const res = await window.api.anki.getDueCards(deckId);
      if (res.success && res.cards) {
        setCards(res.cards);
      }
    }
    setLoading(false);
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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const audio = new Audio(card.media_url);
      audioRef.current = audio;
      audio.play().catch(e => console.error("Audio play failed:", e));
    }
  };

  // Auto-play audio when card appears if it's a listening card
  useEffect(() => {
    if (!loading && cards[currentIndex]) {
       const card = cards[currentIndex];
       if (card.card_type === 'listening' && !showingAnswer) {
          playAudio();
       } else if (showingAnswer && card.media_url) {
          playAudio();
       }
    }
  }, [currentIndex, showingAnswer, loading]);

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
      <header className="h-14 border-b border-dark-border flex items-center justify-between px-6 bg-dark-surface/50 backdrop-blur">
        <div className="flex items-center gap-4 text-sm font-medium">
           <span className="text-dark-subtext">Cartão {currentIndex + 1} de {cards.length}</span>
        </div>
        <button onClick={onClose} className="p-2 text-dark-subtext hover:text-dark-text hover:bg-white/5 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Card Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-2xl bg-dark-surface rounded-2xl border border-dark-border shadow-2xl overflow-hidden flex flex-col min-h-[400px]">
          
          {/* Front */}
          <div className="flex-1 p-10 flex flex-col items-center justify-center text-center relative">
            {card.card_type === 'listening' ? (
              <button 
                onClick={playAudio}
                className="w-20 h-20 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center hover:bg-indigo-600/40 transition-colors cursor-pointer"
              >
                <Volume2 className="w-10 h-10" />
              </button>
            ) : (
              <div 
                className="text-3xl font-medium leading-relaxed text-dark-text"
                dangerouslySetInnerHTML={{ __html: card.front }} 
              />
            )}
          </div>

          {/* Divider */}
          {showingAnswer && <div className="h-px w-full bg-dark-border" />}

          {/* Back */}
          {showingAnswer && (
            <div className="flex-1 p-10 flex flex-col items-center justify-center text-center bg-white/5 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div 
                className="text-xl text-dark-subtext whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: card.back }}
              />
              {card.media_url && card.card_type === 'reading' && (
                <button onClick={playAudio} className="mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm">
                   <Volume2 className="w-4 h-4" /> Ouvir Novamente
                </button>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Controls */}
      <footer className="h-24 flex items-center justify-center p-4 bg-dark-bg">
        {!showingAnswer ? (
          <button 
            onClick={() => setShowingAnswer(true)}
            className="px-12 py-4 bg-dark-surface border border-dark-border rounded-xl text-lg font-medium hover:bg-white/5 hover:border-indigo-500 transition-all w-full max-w-md"
          >
            Mostrar Resposta <span className="ml-2 text-dark-subtext text-sm">(Espaço)</span>
          </button>
        ) : (
          <div className="flex gap-4 w-full max-w-2xl px-4">
            <button onClick={() => handleRating(1)} className="flex-1 py-3 px-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-medium flex flex-col items-center justify-center gap-1">
              <span>Errei (Again)</span>
              <span className="text-xs opacity-60">1</span>
            </button>
            <button onClick={() => handleRating(2)} className="flex-1 py-3 px-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 font-medium flex flex-col items-center justify-center gap-1">
              <span>Difícil (Hard)</span>
              <span className="text-xs opacity-60">2</span>
            </button>
            <button onClick={() => handleRating(3)} className="flex-1 py-3 px-2 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 font-medium flex flex-col items-center justify-center gap-1">
              <span>Bom (Good)</span>
              <span className="text-xs opacity-60">3</span>
            </button>
            <button onClick={() => handleRating(4)} className="flex-1 py-3 px-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 font-medium flex flex-col items-center justify-center gap-1">
              <span>Fácil (Easy)</span>
              <span className="text-xs opacity-60">4</span>
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}

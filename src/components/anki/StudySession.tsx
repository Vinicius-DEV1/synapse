import React, { useState, useEffect } from 'react';
import { RotateCcw, X, Edit3, Trash2 } from 'lucide-react';
import { Portal } from '../ui/Portal';
import CardEditor from './CardEditor';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import confetti from 'canvas-confetti';
import { getSettings, type AppSettings } from '../../utils/settings';
import { playFlipSound, playCorrectSound, playIncorrectSound } from './utils/sounds';
import type { Card } from './types';
import { ReadingCard } from './study/ReadingCard';
import { ListeningCard } from './study/ListeningCard';
import { TypingCard } from './study/TypingCard';
import { ClozeCard } from './study/ClozeCard';
import { SpeakingCard } from './study/SpeakingCard';
import { SessionSummary } from './study/SessionSummary';

function StudySessionContent({ deckId, onClose }: { deckId: string; onClose: () => void }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  
  // Feedback states
  const [evaluating, setEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{verdict: string, feedback: string, transcription?: string} | null>(null);
  const [exactMatch, setExactMatch] = useState<boolean | null>(null);
  const [isRetry, setIsRetry] = useState(false);
  const [intervals, setIntervals] = useState<string[]>(['', '', '', '']);
  
  const [sessionStartTime] = useState<number>(Date.now());
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [flipState, setFlipState] = useState<'front' | 'flipping-out' | 'flipping-in' | 'back'>('front');
  
  const { play: playUrl } = useAudioPlayer();

  useEffect(() => {
    setAppSettings(getSettings());
  }, []);

  useEffect(() => {
    if (!loading && cards.length === 0) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 300 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults, particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults, particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [loading, cards.length]);

  useEffect(() => {
    loadDueCards();
  }, [deckId]);

  useEffect(() => {
    if (showingAnswer && cards[currentIndex] && !isRetry) {
      if (window.api?.anki) {
        window.api.anki.getCardIntervals?.(cards[currentIndex].id).then((res: any) => {
           if (res?.success && res.intervals) {
             setIntervals(res.intervals);
           }
        }).catch(console.error);
      }
    }
  }, [showingAnswer, currentIndex, cards, isRetry]);

  const loadDueCards = async () => {
    setLoading(true);
    if (window.api?.anki) {
      const res = await window.api.anki.getDueCards(deckId);
      if (res && res.success && res.cards) {
        setCards(res.cards);
      } else if (Array.isArray(res)) {
        setCards(res);
      }
    }
    setCurrentIndex(0);
    setShowingAnswer(false);
    setFlipState('front');
    setIsRetry(false);
    resetCardState();
    setLoading(false);
  };

  const resetCardState = () => {
    setEvaluating(false);
    setAiFeedback(null);
    setExactMatch(null);
    setIntervals(['', '', '', '']);
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
    if (appSettings?.enableStudySfx) {
      if (rating <= 2) playIncorrectSound();
      else playCorrectSound();
    }

    const card = cards[currentIndex];
    
    setSessionStats(prev => ({
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (rating >= 3 ? 1 : 0)
    }));

    if (window.api?.anki) {
      await window.api.anki.reviewCard(card.id, rating);
    }
    
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(curr => curr + 1);
      setShowingAnswer(false);
      setFlipState('front');
      setIsRetry(false);
      resetCardState();
    } else {
      loadDueCards();
    }
  };

  const handleRetryPractice = () => {
    setShowingAnswer(false);
    setFlipState('front');
    setIsRetry(false);
    resetCardState();
  };

  const revealAnswer = () => {
    if (appSettings?.enableStudySfx) playFlipSound();
    
    if (appSettings?.enableStudy3DFlip) {
       setFlipState('flipping-out');
       setTimeout(() => {
          setShowingAnswer(true);
          setFlipState('flipping-in');
          setTimeout(() => {
             setFlipState('back');
          }, 50);
       }, 200); 
    } else {
       setShowingAnswer(true);
       setFlipState('back');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
         onClose();
         return;
      }
      
      const card = cards[currentIndex];
      
      if (!showingAnswer) {
        if (card && (card.card_type === 'typing' || card.card_type === 'cloze')) {
           return;
        }
        if (card && card.card_type === 'speaking') {
           if (e.key === ' ' || e.key === 'Enter') {
           }
        }
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          revealAnswer();
        }
      } else {
        if (e.key === '1') handleRating(1);
        if (e.key === '2') handleRating(2);
        if (e.key === '3') handleRating(3);
        if (e.key === '4') handleRating(4);
        if (e.key === 't' || e.key === 'T') {
           e.preventDefault();
           handleRetryPractice();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showingAnswer, currentIndex, cards]);

  const playAudio = () => {
    const card = cards[currentIndex];
    if (card?.media_url) {
      playUrl(card.media_url);
    }
  };

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

  const handleAnswerSubmit = async (typedAnswer?: string, audioBase64?: string) => {
    const card = cards[currentIndex];
    if (!typedAnswer?.trim() && !audioBase64) {
        setEvaluating(false);
        setShowingAnswer(true);
        return;
    }

    let expected = card.back;
    if (card.card_type === 'cloze') {
        const targetC = (card.ord ?? 0) + 1;
        const regex = new RegExp(`\\{\\{c${targetC}::(.*?)\\}\\}`);
        const match = card.front.match(regex);
        if (match) expected = match[1];
    }

    if (card.validation_mode === 'ai' || (card.card_type === 'speaking' && !!audioBase64)) {
        setEvaluating(true);
        try {
            const { promptGeminiForAnkiEvaluation } = await import('../../services/gemini');
            const { getSettings } = await import('../../utils/settings');
            const settings = getSettings();
            const modelToUse = settings.geminiModelFlashcards || settings.geminiModel;
            const res = await promptGeminiForAnkiEvaluation(card.front, expected, typedAnswer || '', audioBase64, modelToUse);
            setAiFeedback(res as any);
        } catch (err) {
            console.error(`[Flashcards] Falha na IA:`, err);
            setAiFeedback({ verdict: 'Incorreto', feedback: 'Erro de IA. Avalie manualmente.' });
        }
        setEvaluating(false);
    } else if (typedAnswer) {
        setExactMatch(typedAnswer.trim().toLowerCase() === expected.trim().toLowerCase());
        setEvaluating(false);
    }
    revealAnswer();
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
          source_id: editingCard.source_id,
          deck_id: editingCard.deck_id
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
      <div className="fixed inset-0 bg-dark-bg flex items-center justify-center text-dark-text z-[200] p-4">
        <div className="w-full max-w-2xl bg-dark-card border border-dark-border rounded-2xl p-10 flex flex-col items-center justify-center shadow-2xl min-h-[400px]">
           <div className="w-2/3 h-8 bg-white/5 rounded-lg animate-pulse mb-8"></div>
           <div className="w-1/2 h-6 bg-white/5 rounded-lg animate-pulse mb-12"></div>
           <div className="w-full h-px bg-dark-border my-6"></div>
           <div className="w-3/4 h-6 bg-white/5 rounded-lg animate-pulse mb-4"></div>
           <div className="w-1/2 h-6 bg-white/5 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return <SessionSummary sessionStats={sessionStats} sessionStartTime={sessionStartTime} onClose={onClose} />;
  }

  const card = cards[currentIndex];

  const commonProps = {
    card,
    showingAnswer,
    onAnswerSubmit: handleAnswerSubmit,
    playAudio,
    evaluating,
    exactMatch,
    aiFeedback
  };

  return (
    <div className="fixed inset-0 bg-dark-bg flex flex-col z-[200] select-text">
      {/* Floating Header Controls */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-10">
        <div className="flex items-center gap-4 text-sm font-medium bg-dark-bg/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 shadow-lg">
           <span className="text-dark-subtext">Cartão {currentIndex + 1} de {cards.length}</span>
        </div>
      </div>
      
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-10 flex gap-2 bg-dark-bg/60 backdrop-blur-md p-1 rounded-xl border border-white/5 shadow-lg">
        {showingAnswer && (
          <>
            <button onClick={handleRetryPractice} className="p-2 text-dark-subtext hover:text-indigo-400 hover:bg-white/10 rounded-lg transition-colors" title="Treinar Novamente (Tecla T)">
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="w-[1px] h-6 bg-white/10 my-auto mx-1"></div>
          </>
        )}
        <button onClick={() => setEditingCard(card)} className="p-2 text-dark-subtext hover:text-indigo-400 hover:bg-white/10 rounded-lg transition-colors" title="Editar Cartão">
          <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button onClick={handleDeleteCard} className="p-2 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors" title="Excluir Cartão">
          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <div className="w-[1px] h-6 bg-white/10 my-auto mx-1"></div>
        <button onClick={onClose} className="p-2 text-dark-subtext hover:text-dark-text hover:bg-white/10 rounded-lg transition-colors" title="Fechar Sessão">
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Card Area */}
      <main className="flex-1 flex flex-col p-6 sm:p-12 pb-24 sm:pb-32 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl flex flex-col items-center gap-8 shrink-0">
          <div 
            className="w-full bg-dark-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden flex flex-col min-h-[400px]"
            style={{
              transform: flipState === 'flipping-out' ? 'perspective(1000px) rotateY(90deg) scale(0.95)' : 
                         flipState === 'flipping-in' ? 'perspective(1000px) rotateY(-90deg) scale(0.95)' : 
                         'perspective(1000px) rotateY(0deg) scale(1)',
              transition: flipState === 'flipping-in' ? 'none' : 'transform 0.2s ease-in-out',
            }}
          >
            {card.card_type === 'reading' && <ReadingCard {...commonProps} />}
            {card.card_type === 'listening' && <ListeningCard {...commonProps} />}
            {card.card_type === 'typing' && <TypingCard {...commonProps} />}
            {card.card_type === 'cloze' && <ClozeCard {...commonProps} />}
            {card.card_type === 'speaking' && <SpeakingCard {...commonProps} />}
          </div>
        </div>
      </main>

      {/* Controls Floating Dock */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 lg:translate-x-0 lg:left-auto lg:top-1/2 lg:-translate-y-1/2 lg:right-8 z-20 flex flex-col items-center lg:items-end gap-4 pointer-events-none w-[92%] max-w-md lg:w-auto">
        {!showingAnswer ? (
          <button 
            onClick={() => {
              if (card.card_type === 'typing' || card.card_type === 'cloze') {
                handleAnswerSubmit();
              } else {
                revealAnswer();
              }
            }}
            className="pointer-events-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium transition-all duration-300 shadow-2xl hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] flex items-center gap-3 w-full lg:w-auto justify-center"
          >
            Mostrar Resposta <span className="opacity-70 text-sm font-normal">(Espaço)</span>
          </button>
        ) : (
          <div className="pointer-events-auto flex flex-row lg:flex-col gap-2 p-2 bg-dark-bg/80 backdrop-blur-xl border border-white/10 rounded-3xl lg:rounded-2xl shadow-2xl w-full lg:w-auto animate-in fade-in slide-in-from-bottom-4 lg:slide-in-from-right-4 duration-300">
            <button onClick={() => handleRating(1)} className="flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 py-4 lg:py-4 px-2 lg:px-6 rounded-2xl lg:rounded-xl bg-dark-card hover:bg-white/5 text-red-400 border border-white/5 hover:border-red-500/30 font-medium transition-all duration-300">
              <div className="hidden lg:flex items-center justify-center w-6 h-6 rounded bg-black/30 text-xs text-dark-subtext">1</div>
              <div className="flex flex-col items-center lg:items-start gap-1">
                <span className="text-sm lg:text-base leading-none">Errei</span>
                {intervals[0] && <span className="text-[10px] lg:text-xs opacity-70 font-mono bg-black/20 px-1.5 py-0.5 rounded leading-none">{intervals[0]}</span>}
                <span className="text-[10px] opacity-30 block lg:hidden font-normal mt-[-2px] leading-none">Again</span>
              </div>
            </button>
            <button 
              onClick={() => handleRating(2)} 
              disabled={isRetry || aiFeedback?.verdict === 'Incorreto'}
              className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 py-4 lg:py-4 px-2 lg:px-6 rounded-2xl lg:rounded-xl bg-dark-card text-orange-400 border border-white/5 font-medium transition-all duration-300 ${isRetry || aiFeedback?.verdict === 'Incorreto' ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-white/5 hover:border-orange-500/30'}`}>
              <div className="hidden lg:flex items-center justify-center w-6 h-6 rounded bg-black/30 text-xs text-dark-subtext">2</div>
              <div className="flex flex-col items-center lg:items-start gap-1">
                <span className="text-sm lg:text-base leading-none">Difícil</span>
                {intervals[1] && <span className="text-[10px] lg:text-xs opacity-70 font-mono bg-black/20 px-1.5 py-0.5 rounded leading-none">{intervals[1]}</span>}
                <span className="text-[10px] opacity-30 block lg:hidden font-normal mt-[-2px] leading-none">Hard</span>
              </div>
            </button>
            <button 
              onClick={() => handleRating(3)} 
              disabled={isRetry || aiFeedback?.verdict === 'Incorreto' || aiFeedback?.verdict === 'Parcial'}
              className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 py-4 lg:py-4 px-2 lg:px-6 rounded-2xl lg:rounded-xl bg-dark-card text-green-400 border border-white/5 font-medium transition-all duration-300 ${isRetry || aiFeedback?.verdict === 'Incorreto' || aiFeedback?.verdict === 'Parcial' ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-white/5 hover:border-green-500/30'}`}>
              <div className="hidden lg:flex items-center justify-center w-6 h-6 rounded bg-black/30 text-xs text-dark-subtext">3</div>
              <div className="flex flex-col items-center lg:items-start gap-1">
                <span className="text-sm lg:text-base leading-none">Bom</span>
                {intervals[2] && <span className="text-[10px] lg:text-xs opacity-70 font-mono bg-black/20 px-1.5 py-0.5 rounded leading-none">{intervals[2]}</span>}
                <span className="text-[10px] opacity-30 block lg:hidden font-normal mt-[-2px] leading-none">Good</span>
              </div>
            </button>
            <button 
              onClick={() => handleRating(4)} 
              disabled={isRetry || aiFeedback?.verdict === 'Incorreto' || aiFeedback?.verdict === 'Parcial'}
              className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-4 py-4 lg:py-4 px-2 lg:px-6 rounded-2xl lg:rounded-xl bg-dark-card text-blue-400 border border-white/5 font-medium transition-all duration-300 ${isRetry || aiFeedback?.verdict === 'Incorreto' || aiFeedback?.verdict === 'Parcial' ? 'opacity-30 cursor-not-allowed grayscale' : 'hover:bg-white/5 hover:border-blue-500/30'}`}>
              <div className="hidden lg:flex items-center justify-center w-6 h-6 rounded bg-black/30 text-xs text-dark-subtext">4</div>
              <div className="flex flex-col items-center lg:items-start gap-1">
                <span className="text-sm lg:text-base leading-none">Fácil</span>
                {intervals[3] && <span className="text-[10px] lg:text-xs opacity-70 font-mono bg-black/20 px-1.5 py-0.5 rounded leading-none">{intervals[3]}</span>}
                <span className="text-[10px] opacity-30 block lg:hidden font-normal mt-[-2px] leading-none">Easy</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudySession(props: { deckId: string; onClose: () => void }) {
  return (
    <Portal>
      <StudySessionContent {...props} />
    </Portal>
  );
}

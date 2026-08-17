import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { getSettings, type AppSettings } from '../../../utils/settings';
import { playFlipSound, playCorrectSound, playIncorrectSound } from '../utils/sounds';
import type { Card } from '../types';

export function useStudySession(deckId: string) {
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showingAnswer, setShowingAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  // Feedback states
  const [evaluating, setEvaluating] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{
    verdict: string;
    feedback: string;
    transcription?: string;
  } | null>(null);
  const [exactMatch, setExactMatch] = useState<boolean | null>(null);
  const [isRetry, setIsRetry] = useState(false);
  const [intervals, setIntervals] = useState<string[]>(['', '', '', '']);

  const [sessionStartTime] = useState<number>(Date.now());
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [flipState, setFlipState] = useState<'front' | 'flipping-out' | 'flipping-in' | 'back'>('front');

  useEffect(() => {
    setAppSettings(getSettings());
  }, []);

  // Confetti on session completion
  useEffect(() => {
    if (!loading && cards.length === 0) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 300 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
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
        (window.api.anki as any)
          .getCardIntervals?.(cards[currentIndex].id)
          .then((res: any) => {
            if (res?.success && res.intervals) {
              setIntervals(res.intervals);
            }
          })
          .catch(console.error);
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

    setSessionStats((prev) => ({
      reviewed: prev.reviewed + 1,
      correct: prev.correct + (rating >= 3 ? 1 : 0),
    }));

    if (window.api?.anki) {
      await window.api.anki.reviewCard(card.id, rating);
    }

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((curr) => curr + 1);
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

  return {
    cards,
    currentIndex,
    currentCard: cards[currentIndex],
    showingAnswer,
    setShowingAnswer,
    loading,
    editingCard,
    setEditingCard,
    evaluating,
    setEvaluating,
    aiFeedback,
    setAiFeedback,
    exactMatch,
    setExactMatch,
    isRetry,
    setIsRetry,
    intervals,
    sessionStartTime,
    sessionStats,
    flipState,
    loadDueCards,
    handleDeleteCard,
    handleRating,
    handleRetryPractice,
    revealAnswer,
  };
}

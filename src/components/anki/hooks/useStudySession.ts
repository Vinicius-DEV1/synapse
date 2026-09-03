import { useState, useEffect, useCallback, useRef } from 'react';
import { getSettings, type AppSettings } from '../../../utils/settings';
import { playFlipSound, playCorrectSound, playIncorrectSound } from '../utils/sounds';
import { triggerCelebrationConfetti } from '../../../utils/confetti';
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

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setAppSettings(getSettings());
  }, []);

  // Confetti on session completion
  useEffect(() => {
    if (!loading && cards.length === 0) {
      const cancel = triggerCelebrationConfetti({ durationMs: 3000, zIndex: 300 });
      return cancel;
    }
  }, [loading, cards.length]);

  const resetCardState = useCallback(() => {
    setEvaluating(false);
    setAiFeedback(null);
    setExactMatch(null);
    setIntervals(['', '', '', '']);
  }, []);

  const loadDueCards = useCallback(async () => {
    setLoading(true);
    try {
      if (window.api?.anki) {
        const res = await window.api.anki.getDueCards(deckId);
        if (!isMountedRef.current) return;
        if (res && res.success && res.cards) {
          setCards(res.cards);
        } else if (Array.isArray(res)) {
          setCards(res);
        }
      }
    } catch (err) {
      if (isMountedRef.current) console.error('[SRS] Failed to load due cards:', err);
    } finally {
      if (isMountedRef.current) {
        setCurrentIndex(0);
        setShowingAnswer(false);
        setFlipState('front');
        setIsRetry(false);
        resetCardState();
        setLoading(false);
      }
    }
  }, [deckId, resetCardState]);

  useEffect(() => {
    loadDueCards();
  }, [loadDueCards]);

  useEffect(() => {
    let isCurrent = true;
    const targetCard = cards[currentIndex];

    if (showingAnswer && targetCard && !isRetry) {
      if (window.api?.anki) {
        window.api.anki
          .getCardIntervals?.(targetCard.id)
          .then((res: any) => {
            if (isCurrent && isMountedRef.current && res?.success && res.intervals) {
              setIntervals(res.intervals);
            }
          })
          .catch((err) => {
            if (isCurrent) console.error('[SRS] Interval fetch error:', err);
          });
      }
    }

    return () => {
      isCurrent = false;
    };
  }, [showingAnswer, currentIndex, cards, isRetry]);

  const handleDeleteCard = useCallback(async () => {
    const card = cards[currentIndex];
    if (!card) return;
    if (window.confirm('Tem certeza que deseja excluir este cartão definitivamente?')) {
      if (window.api?.anki) {
        await window.api.anki.deleteCard(card.id);
        loadDueCards();
      }
    }
  }, [cards, currentIndex, loadDueCards]);

  const handleRating = useCallback(
    async (rating: number) => {
      if (appSettings?.enableStudySfx) {
        if (rating <= 2) playIncorrectSound();
        else playCorrectSound();
      }

      const card = cards[currentIndex];
      if (!card) return;

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
    },
    [appSettings, cards, currentIndex, loadDueCards, resetCardState]
  );

  const handleRetryPractice = useCallback(() => {
    setShowingAnswer(false);
    setFlipState('front');
    setIsRetry(false);
    resetCardState();
  }, [resetCardState]);

  const revealAnswer = useCallback(() => {
    if (appSettings?.enableStudySfx) playFlipSound();

    if (appSettings?.enableStudy3DFlip) {
      setFlipState('flipping-out');
      setTimeout(() => {
        if (!isMountedRef.current) return;
        setShowingAnswer(true);
        setFlipState('flipping-in');
        setTimeout(() => {
          if (!isMountedRef.current) return;
          setFlipState('back');
        }, 50);
      }, 200);
    } else {
      setShowingAnswer(true);
      setFlipState('back');
    }
  }, [appSettings]);

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

import  { useEffect } from 'react';
import { RotateCcw, X, Edit3, Trash2 } from 'lucide-react';
import { Portal } from '../ui/Portal';
import CardEditor from './CardEditor';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useStudySession } from './hooks/useStudySession';
import { ReadingCard } from './study/ReadingCard';
import { ListeningCard } from './study/ListeningCard';
import { TypingCard } from './study/TypingCard';
import { ClozeCard } from './study/ClozeCard';
import { SpeakingCard } from './study/SpeakingCard';
import { SessionSummary } from './study/SessionSummary';

import { StudyTopBar } from './study/StudyTopBar';
import { StudyRatingDock } from './study/StudyRatingDock';

function StudySessionContent({ deckId, onClose }: { deckId: string; onClose: () => void }) {
  const {
    cards,
    currentIndex,
    currentCard,
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
    intervals,
    sessionStartTime,
    sessionStats,
    flipState,
    loadDueCards,
    handleDeleteCard,
    handleRating,
    handleRetryPractice,
    revealAnswer,
  } = useStudySession(deckId);

  const { play: playUrl } = useAudioPlayer();

  const playAudio = () => {
    if (currentCard?.media_url) {
      playUrl(currentCard.media_url);
    }
  };

  useEffect(() => {
    if (!loading && currentCard) {
      if (currentCard.card_type === 'listening' && !showingAnswer) {
        playAudio();
      } else if (showingAnswer && currentCard.media_url && currentCard.card_type !== 'listening') {
        playAudio();
      }
    }
  }, [currentIndex, showingAnswer, loading]);

  const handleAnswerSubmit = async (typedAnswer?: string, audioBase64?: string) => {
    if (!currentCard) return;

    if (!typedAnswer?.trim() && !audioBase64) {
      setEvaluating(false);
      setShowingAnswer(true);
      return;
    }

    let expected = currentCard.back;
    if (currentCard.card_type === 'cloze') {
      const targetC = (currentCard.ord ?? 0) + 1;
      const regex = new RegExp(`\\{\\{c${targetC}::(.*?)\\}\\}`);
      const match = currentCard.front.match(regex);
      if (match) expected = match[1];
    }

    if (currentCard.validation_mode === 'ai' || (currentCard.card_type === 'speaking' && !!audioBase64)) {
      setEvaluating(true);
      try {
        const { promptGeminiForAnkiEvaluation } = await import('../../services/gemini');
        const { getSettings } = await import('../../utils/settings');
        const settings = getSettings();
        const modelToUse = settings.geminiModelFlashcards || settings.geminiModel;
        const res = await promptGeminiForAnkiEvaluation(
          currentCard.front,
          expected,
          typedAnswer || '',
          audioBase64,
          modelToUse
        );
        setAiFeedback(res as any);
      } catch (err) {
        console.error(`[Flashcards] Failed AI evaluation:`, err);
        setAiFeedback({ verdict: 'Incorreto', feedback: 'Erro de IA. Avalie manualmente.' });
      }
      setEvaluating(false);
    } else if (typedAnswer) {
      setExactMatch(typedAnswer.trim().toLowerCase() === expected.trim().toLowerCase());
      setEvaluating(false);
    }
    revealAnswer();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (!showingAnswer) {
        if (currentCard && (currentCard.card_type === 'typing' || currentCard.card_type === 'cloze')) {
          return;
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
  }, [showingAnswer, currentIndex, currentCard]);

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
          deck_id: editingCard.deck_id,
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
          <div className="w-2/3 h-8 bg-white/5 rounded-lg animate-pulse mb-8" />
          <div className="w-1/2 h-6 bg-white/5 rounded-lg animate-pulse mb-12" />
          <div className="w-full h-px bg-dark-border my-6" />
          <div className="w-3/4 h-6 bg-white/5 rounded-lg animate-pulse mb-4" />
          <div className="w-1/2 h-6 bg-white/5 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return <SessionSummary sessionStats={sessionStats} sessionStartTime={sessionStartTime} onClose={onClose} />;
  }

  const commonProps = {
    card: currentCard,
    showingAnswer,
    onAnswerSubmit: handleAnswerSubmit,
    playAudio,
    evaluating,
    exactMatch,
    aiFeedback,
  };

  return (
    <div className="fixed inset-0 bg-dark-bg flex flex-col z-[200] select-text">
      <StudyTopBar
        currentIndex={currentIndex}
        totalCards={cards.length}
        showingAnswer={showingAnswer}
        currentCard={currentCard}
        onRetryPractice={handleRetryPractice}
        onEditCard={(c) => setEditingCard(c)}
        onDeleteCard={handleDeleteCard}
        onClose={onClose}
      />

      {/* Card Area */}
      <main className="flex-1 flex flex-col p-6 sm:p-12 pb-24 sm:pb-32 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl flex flex-col items-center gap-8 shrink-0">
          <div
            className="w-full bg-dark-card rounded-2xl border border-white/5 shadow-2xl overflow-hidden flex flex-col min-h-[400px]"
            style={{
              transform:
                flipState === 'flipping-out'
                  ? 'perspective(1000px) rotateY(90deg) scale(0.95)'
                  : flipState === 'flipping-in'
                  ? 'perspective(1000px) rotateY(-90deg) scale(0.95)'
                  : 'perspective(1000px) rotateY(0deg) scale(1)',
              transition: flipState === 'flipping-in' ? 'none' : 'transform 0.2s ease-in-out',
            }}
          >
            {currentCard.card_type === 'reading' && <ReadingCard {...commonProps} />}
            {currentCard.card_type === 'listening' && <ListeningCard {...commonProps} />}
            {currentCard.card_type === 'typing' && <TypingCard {...commonProps} />}
            {currentCard.card_type === 'cloze' && <ClozeCard {...commonProps} />}
            {currentCard.card_type === 'speaking' && <SpeakingCard {...commonProps} />}
          </div>
        </div>
      </main>

      {/* Controls Floating Dock */}
      <StudyRatingDock
        showingAnswer={showingAnswer}
        currentCard={currentCard}
        intervals={intervals}
        isRetry={isRetry}
        aiFeedback={aiFeedback}
        onRevealAnswer={revealAnswer}
        onAnswerSubmit={() => handleAnswerSubmit()}
        onRating={handleRating}
      />
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

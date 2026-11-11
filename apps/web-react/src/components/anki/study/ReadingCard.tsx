import type { Card } from '../types';
import { HtmlRenderer } from '../components/HtmlRenderer';

export interface StudyCardProps {
  card: Card;
  showingAnswer: boolean;
  onAnswerSubmit: (answer?: string, audioBase64?: string) => void;
  playAudio: () => void;
  evaluating: boolean;
  exactMatch: boolean | null;
  aiFeedback: { verdict: string; feedback: string; transcription?: string } | null;
}

export function ReadingCard({ card, showingAnswer }: StudyCardProps) {
  return (
    <>
      {/* Front */}
      <div className="flex-1 p-10 flex flex-col items-center justify-center text-center relative">
        <HtmlRenderer html={card.front} className="text-3xl font-medium leading-relaxed text-dark-text block" as="div" />
      </div>
      
      {/* Back */}
      {showingAnswer && (
        <>
          <div className="h-px w-full bg-white/5" />
          <div className="flex-1 p-8 flex flex-col items-center justify-center text-center bg-dark-card animate-in fade-in slide-in-from-bottom-4 duration-300">
            <HtmlRenderer html={card.back} className="text-base text-dark-subtext whitespace-pre-wrap leading-relaxed block" as="div" />
          </div>
        </>
      )}
    </>
  );
}

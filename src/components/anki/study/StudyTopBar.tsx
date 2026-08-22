import { RotateCcw, X, Edit3, Trash2 } from 'lucide-react';
import type { Card } from '../types';

interface StudyTopBarProps {
  currentIndex: number;
  totalCards: number;
  showingAnswer: boolean;
  currentCard: Card | null;
  onRetryPractice: () => void;
  onEditCard: (card: Card) => void;
  onDeleteCard: () => void;
  onClose: () => void;
}

export function StudyTopBar({
  currentIndex,
  totalCards,
  showingAnswer,
  currentCard,
  onRetryPractice,
  onEditCard,
  onDeleteCard,
  onClose,
}: StudyTopBarProps) {
  return (
    <>
      {/* Counter Left */}
      <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-10">
        <div className="flex items-center gap-4 text-sm font-medium bg-dark-bg/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 shadow-lg">
          <span className="text-dark-subtext">
            Cartão {currentIndex + 1} de {totalCards}
          </span>
        </div>
      </div>

      {/* Action Buttons Right */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-10 flex gap-2 bg-dark-bg/60 backdrop-blur-md p-1 rounded-xl border border-white/5 shadow-lg">
        {showingAnswer && (
          <>
            <button
              onClick={onRetryPractice}
              className="p-2 text-dark-subtext hover:text-indigo-400 hover:bg-white/10 rounded-lg transition-colors"
              title="Treinar Novamente (Tecla T)"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <div className="w-[1px] h-6 bg-white/10 my-auto mx-1" />
          </>
        )}
        {currentCard && (
          <button
            onClick={() => onEditCard(currentCard)}
            className="p-2 text-dark-subtext hover:text-indigo-400 hover:bg-white/10 rounded-lg transition-colors"
            title="Editar Cartão"
          >
            <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
        <button
          onClick={onDeleteCard}
          className="p-2 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
          title="Excluir Cartão"
        >
          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <div className="w-[1px] h-6 bg-white/10 my-auto mx-1" />
        <button
          onClick={onClose}
          className="p-2 text-dark-subtext hover:text-dark-text hover:bg-white/10 rounded-lg transition-colors"
          title="Fechar Sessão"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </>
  );
}

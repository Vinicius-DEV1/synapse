import React from 'react';
import { Portal } from '../../../ui/Portal';

interface QuizDeleteModalsProps {
  deletingQuestionInfo: { id: string; index: number } | null;
  onCancelDeleteQuestion: () => void;
  onConfirmDeleteQuestion: (id: string) => void;
  showDeleteContainerModal: boolean;
  totalQuestions: number;
  onCancelDeleteContainer: () => void;
  onConfirmDeleteContainer: () => void;
}

export function QuizDeleteModals({
  deletingQuestionInfo,
  onCancelDeleteQuestion,
  onConfirmDeleteQuestion,
  showDeleteContainerModal,
  totalQuestions,
  onCancelDeleteContainer,
  onConfirmDeleteContainer
}: QuizDeleteModalsProps) {
  return (
    <>
      {/* Modal de Exclusão de Questão */}
      {deletingQuestionInfo && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onCancelDeleteQuestion}
          >
            <div
              className="bg-dark-card border border-red-500/20 rounded-2xl p-6 w-[360px] shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-2">Excluir Questão</h3>
              <p className="text-dark-subtext text-sm mb-6">
                Deseja realmente remover a questão #{deletingQuestionInfo.index + 1}?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={onCancelDeleteQuestion}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-dark-subtext hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onConfirmDeleteQuestion(deletingQuestionInfo.id)}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Modal de Exclusão do Container Inteiro */}
      {showDeleteContainerModal && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onCancelDeleteContainer}
          >
            <div
              className="bg-dark-card border border-red-500/20 rounded-2xl p-6 w-[380px] shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-2">Remover Bateria Inteira</h3>
              <p className="text-dark-subtext text-sm mb-6">
                Deseja realmente excluir todo este bloco de exercícios e suas {totalQuestions}{' '}
                questões?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={onCancelDeleteContainer}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-dark-subtext hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirmDeleteContainer}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Excluir Bloco
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

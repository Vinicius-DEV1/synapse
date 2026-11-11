import { Plus } from 'lucide-react';
import { QuizEditorCard } from './QuizEditorCard';
import type { QuestionItem } from '../types';

interface QuizEditorProps {
  questions: QuestionItem[];
  onUpdateQuestion: (qId: string, partial: Partial<QuestionItem>, immediate?: boolean) => void;
  onToggleQuestionType: (q: QuestionItem, newType: 'multiple_choice' | 'open') => void;
  onMoveQuestion: (index: number, direction: 'up' | 'down') => void;
  onDeleteQuestion: (qId: string, index: number) => void;
  onAddQuestion: () => void;
}

export default function QuizEditor({
  questions,
  onUpdateQuestion,
  onToggleQuestionType,
  onMoveQuestion,
  onDeleteQuestion,
  onAddQuestion,
}: QuizEditorProps) {
  const safeQuestions = Array.isArray(questions) ? questions : [];

  return (
    <div className="space-y-6">
      {safeQuestions.map((q, qIndex) => (
        <QuizEditorCard
          key={q.id}
          q={q}
          qIndex={qIndex}
          totalQuestions={safeQuestions.length}
          onUpdateQuestion={onUpdateQuestion}
          onToggleQuestionType={onToggleQuestionType}
          onMoveQuestion={onMoveQuestion}
          onDeleteQuestion={onDeleteQuestion}
        />
      ))}

      <button
        onClick={onAddQuestion}
        className="w-full py-3 border border-dashed border-white/10 hover:border-white/20 rounded-2xl text-dark-subtext hover:text-white flex items-center justify-center gap-2 text-xs font-medium hover:bg-white/[0.02] transition-all shadow-xs"
      >
        <Plus size={15} />
        <span>Adicionar Nova Questão</span>
      </button>
    </div>
  );
}

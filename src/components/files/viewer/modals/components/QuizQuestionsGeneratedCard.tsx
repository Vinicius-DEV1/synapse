import { useState } from 'react';
import { Layers, Plus, Check, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import type { QuestionItem, ReferencedBattery } from '../../../../editor-extensions/quiz/types';

interface QuizQuestionsGeneratedCardProps {
  battery: ReferencedBattery;
  questions: QuestionItem[];
  isAdded: boolean;
  onAdd: (battery: ReferencedBattery, questions: QuestionItem[]) => Promise<void>;
}

export function QuizQuestionsGeneratedCard({
  battery,
  questions,
  isAdded,
  onAdd,
}: QuizQuestionsGeneratedCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddClick = async () => {
    if (isAdded || isAdding) return;
    setIsAdding(true);
    try {
      await onAdd(battery, questions);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="mt-3.5 p-4 rounded-xl border border-brand-500/30 bg-brand-950/20 shadow-lg text-xs text-gray-200">
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 shrink-0">
            <Layers size={16} />
          </div>
          <div className="min-w-0">
            <h5 className="font-semibold text-white text-xs truncate">
              {questions.length} nova(s) questão(ões) gerada(s)
            </h5>
            <p className="text-[11px] text-brand-300 truncate">
              Para a bateria: <strong>@{battery.title}</strong> ({battery.pageTitle})
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-dark-subtext hover:text-white rounded-lg transition-colors shrink-0"
          title={isExpanded ? 'Recolher detalhes' : 'Expandir prévia das questões'}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded Questions Preview */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-white/10 space-y-2.5 max-h-52 overflow-y-auto pr-1">
          {questions.map((q, idx) => (
            <div key={q.id || idx} className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-dark-subtext">
                <span className="font-bold text-brand-300">Questão {idx + 1}</span>
                <span className="uppercase px-1.5 py-0.5 rounded bg-white/5 font-mono">
                  {q.type === 'open' ? 'Discursiva' : 'Múltipla Escolha'}
                </span>
              </div>
              <p className="text-white font-medium text-xs">{q.question}</p>
              {q.type === 'multiple_choice' && (
                <div className="pl-2 space-y-0.5 mt-1 text-[11px]">
                  {q.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className={`flex items-center gap-1.5 ${
                        oIdx === q.correctIndex ? 'text-emerald-400 font-semibold' : 'text-dark-subtext'
                      }`}
                    >
                      <span>{String.fromCharCode(65 + oIdx)})</span>
                      <span>{opt}</span>
                      {oIdx === q.correctIndex && <span className="text-[9px] bg-emerald-500/20 px-1 rounded">Gabarito</span>}
                    </div>
                  ))}
                </div>
              )}
              {q.type === 'open' && q.expectedAnswer && (
                <p className="text-[11px] text-emerald-400/90 pl-2 mt-1">
                  <strong>Gabarito modelo:</strong> {q.expectedAnswer}
                </p>
              )}
              {q.explanation && (
                <p className="text-[10px] text-dark-subtext italic pl-2">
                  {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
        <span className="text-[10px] text-dark-subtext flex items-center gap-1">
          <HelpCircle size={12} />
          <span>Serão anexadas ao final da bateria</span>
        </span>

        <button
          type="button"
          onClick={handleAddClick}
          disabled={isAdded || isAdding}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${
            isAdded
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
          }`}
        >
          {isAdded ? (
            <>
              <Check size={14} />
              <span>Questões Adicionadas à Bateria</span>
            </>
          ) : (
            <>
              <Plus size={14} />
              <span>Adicionar {questions.length} Questões à Bateria</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

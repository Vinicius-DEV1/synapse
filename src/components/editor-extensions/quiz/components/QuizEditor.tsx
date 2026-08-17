import {
  
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Tag,
  
  FileText,
  ListOrdered,
} from 'lucide-react';
import { generateAutoTags } from '../utils/autoTags';
import type { QuestionItem } from '../types';

interface QuizEditorProps {
  questions: QuestionItem[];
  onUpdateQuestion: (qId: string, partial: Partial<QuestionItem>) => void;
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
  return (
    <div className="space-y-6">
      {questions.map((q, qIndex) => {
        const isOpen = q.type === 'open';

        return (
          <div
            key={q.id}
            className="p-5 bg-black/40 border border-purple-500/20 rounded-2xl space-y-4 relative group/q transition-all hover:border-purple-500/40"
          >
            {/* Header da Questão */}
            <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold font-mono">
                  {qIndex + 1}
                </span>

                {/* Seletor de Tipo */}
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/5 text-xs">
                  <button
                    onClick={() => onToggleQuestionType(q, 'multiple_choice')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                      !isOpen
                        ? 'bg-purple-600 text-white font-semibold'
                        : 'text-dark-subtext hover:text-white'
                    }`}
                  >
                    <ListOrdered size={13} />
                    <span>Múltipla Escolha</span>
                  </button>
                  <button
                    onClick={() => onToggleQuestionType(q, 'open')}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                      isOpen
                        ? 'bg-purple-600 text-white font-semibold'
                        : 'text-dark-subtext hover:text-white'
                    }`}
                  >
                    <FileText size={13} />
                    <span>Aberta / Discursiva</span>
                  </button>
                </div>
              </div>

              {/* Ações de Reordenação e Exclusão */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onMoveQuestion(qIndex, 'up')}
                  disabled={qIndex === 0}
                  className="p-1 text-dark-subtext hover:text-white disabled:opacity-30 rounded hover:bg-white/5 transition-colors"
                  title="Mover para cima"
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  onClick={() => onMoveQuestion(qIndex, 'down')}
                  disabled={qIndex === questions.length - 1}
                  className="p-1 text-dark-subtext hover:text-white disabled:opacity-30 rounded hover:bg-white/5 transition-colors"
                  title="Mover para baixo"
                >
                  <ChevronDown size={15} />
                </button>
                <button
                  onClick={() => onDeleteQuestion(q.id, qIndex)}
                  className="p-1 text-dark-subtext hover:text-red-400 rounded hover:bg-red-500/10 transition-colors ml-1"
                  title="Excluir questão"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Enunciado */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                Enunciado da Questão:
              </label>
              <textarea
                value={q.question}
                onChange={(e) => onUpdateQuestion(q.id, { question: e.target.value })}
                placeholder="Digite a pergunta ou problema aqui..."
                className="w-full bg-black/30 border border-purple-500/20 focus:border-purple-500/50 rounded-xl p-3 text-xs text-purple-100 placeholder-white/20 outline-none resize-y min-h-[70px] leading-relaxed transition-colors"
                rows={3}
              />
            </div>

            {/* Alternativas (Múltipla Escolha) */}
            {!isOpen && (
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                  Alternativas (selecione a correta):
                </label>
                <div className="space-y-2">
                  {q.options.map((opt, optIndex) => {
                    const isCorrect = q.correctIndex === optIndex;
                    const letter = String.fromCharCode(65 + optIndex);

                    return (
                      <div key={optIndex} className="flex items-center gap-2">
                        <button
                          onClick={() => onUpdateQuestion(q.id, { correctIndex: optIndex })}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all ${
                            isCorrect
                              ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                              : 'bg-black/50 text-dark-subtext hover:text-white border border-white/10'
                          }`}
                          title={isCorrect ? 'Alternativa Correta' : 'Marcar como Correta'}
                        >
                          {letter}
                        </button>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOptions = [...q.options];
                            newOptions[optIndex] = e.target.value;
                            onUpdateQuestion(q.id, { options: newOptions });
                          }}
                          placeholder={`Texto da alternativa ${letter}...`}
                          className={`flex-1 bg-black/30 border rounded-xl px-3 py-2 text-xs text-purple-100 placeholder-white/20 outline-none transition-colors ${
                            isCorrect
                              ? 'border-green-500/40 focus:border-green-500'
                              : 'border-white/10 focus:border-purple-500/50'
                          }`}
                        />
                        {q.options.length > 2 && (
                          <button
                            onClick={() => {
                              const newOptions = q.options.filter((_, i) => i !== optIndex);
                              let newCorrect = q.correctIndex;
                              if (optIndex === q.correctIndex) newCorrect = 0;
                              else if (optIndex < q.correctIndex) newCorrect -= 1;
                              onUpdateQuestion(q.id, {
                                options: newOptions,
                                correctIndex: newCorrect,
                              });
                            }}
                            className="p-1.5 text-dark-subtext hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors"
                            title="Remover alternativa"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {q.options.length < 6 && (
                  <button
                    onClick={() => {
                      onUpdateQuestion(q.id, { options: [...q.options, ''] });
                    }}
                    className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 pt-1"
                  >
                    <Plus size={13} />
                    <span>Adicionar Alternativa</span>
                  </button>
                )}
              </div>
            )}

            {/* Resposta Esperada (Questão Aberta) */}
            {isOpen && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                  Resposta Esperada / Palavras-chave:
                </label>
                <textarea
                  value={q.expectedAnswer}
                  onChange={(e) => onUpdateQuestion(q.id, { expectedAnswer: e.target.value })}
                  placeholder="Critérios essenciais ou resposta modelo para a avaliação da IA..."
                  className="w-full bg-black/30 border border-purple-500/20 focus:border-purple-500/50 rounded-xl p-3 text-xs text-purple-100 placeholder-white/20 outline-none resize-y min-h-[60px] leading-relaxed transition-colors"
                  rows={2}
                />
              </div>
            )}

            {/* Tags e Explicação */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                  <Tag size={12} />
                  <span>Tags:</span>
                </span>
                {(q.tags || []).map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="text-[11px] px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1"
                  >
                    #{tag}
                    <button
                      onClick={() => {
                        const newTags = (q.tags || []).filter((_, i) => i !== tIdx);
                        onUpdateQuestion(q.id, { tags: newTags });
                      }}
                      className="hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => {
                    const autoTags = generateAutoTags(q.question, q.options, q.explanation);
                    onUpdateQuestion(q.id, { tags: autoTags });
                  }}
                  className="text-[11px] px-2 py-0.5 rounded-lg bg-purple-950/40 hover:bg-purple-950/70 text-purple-300 border border-purple-500/30 flex items-center gap-1 transition-colors"
                  title="Gerar tags automáticas baseadas no conteúdo"
                >
                  <Sparkles size={11} />
                  <span>Auto-tags</span>
                </button>
              </div>

              {/* Explicação */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-purple-300 uppercase tracking-wider block">
                  Explicação do Gabarito (Markdown suportado):
                </label>
                <textarea
                  value={q.explanation}
                  onChange={(e) => onUpdateQuestion(q.id, { explanation: e.target.value })}
                  placeholder="Explicação detalhada para enriquecer o estudo..."
                  className="w-full bg-black/30 border border-purple-500/20 focus:border-purple-500/50 rounded-xl p-3 text-xs text-purple-100 placeholder-white/20 outline-none resize-y min-h-[60px] leading-relaxed transition-colors"
                  rows={2}
                />
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={onAddQuestion}
        className="w-full py-3 border border-dashed border-purple-500/30 hover:border-purple-500/60 rounded-2xl text-purple-300 hover:text-white flex items-center justify-center gap-2 text-xs font-semibold hover:bg-purple-500/10 transition-all shadow-sm"
      >
        <Plus size={15} />
        <span>Adicionar Nova Questão</span>
      </button>
    </div>
  );
}

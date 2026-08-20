import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Loader2,
  Tag,
} from 'lucide-react';
import { markdownComponents, preprocessMarkdownCode } from '../utils/markdownPreprocess';
import { triggerFireworksAnimation } from '../utils/fireworks';
import QuizHistorySection from './QuizHistorySection';
import type { QuestionItem, AttemptItem } from '../types';

interface QuizPlayerProps {
  questions: QuestionItem[];
  onUpdateSingleQuestion: (qId: string, partial: Partial<QuestionItem>) => void;
  onEvaluateOpenAnswer: (q: QuestionItem, index: number) => Promise<void>;
  evaluatingIds: Record<string, boolean>;
  onDiscussInChat: (q: QuestionItem, index: number) => void;
}

export default function QuizPlayer({
  questions,
  onUpdateSingleQuestion,
  onEvaluateOpenAnswer,
  evaluatingIds,
  onDiscussInChat,
}: QuizPlayerProps) {
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const answeredCount = safeQuestions.filter((q) => q.answered).length;
  const correctCount = safeQuestions.filter((q) => {
    if (!q.answered) return false;
    if (q.type === 'multiple_choice') return q.selectedIndex === q.correctIndex;
    return q.aiFeedback?.verdict === 'Correto';
  }).length;

  const prevAnsweredRef = useRef(0);

  // Efeito de celebração com fogos ao concluir todas as questões da bateria
  useEffect(() => {
    if (
      safeQuestions.length > 0 &&
      answeredCount === safeQuestions.length &&
      prevAnsweredRef.current < safeQuestions.length
    ) {
      triggerFireworksAnimation();
    }
    prevAnsweredRef.current = answeredCount;
  }, [answeredCount, safeQuestions.length]);

  return (
    <div className="space-y-6">
      {/* Barra de Progresso / Desempenho */}
      <div className="p-4 bg-black/40 border border-purple-500/20 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-200">
            <span>Progresso:</span>
            <span className="font-mono text-purple-400">
              {answeredCount}/{safeQuestions.length}
            </span>
          </div>
          {answeredCount > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-green-300">
              <span>• Acertos:</span>
              <span className="font-mono">{correctCount}</span>
              <span className="text-[10px] opacity-70">
                ({Math.round((correctCount / answeredCount) * 100)}%)
              </span>
            </div>
          )}
        </div>

        {answeredCount > 0 && (
          <button
            onClick={() => {
              safeQuestions.forEach((q) => {
                onUpdateSingleQuestion(q.id, {
                  answered: false,
                  selectedIndex: null,
                  userTypedAnswer: '',
                  aiFeedback: null,
                  showExplanation: false,
                });
              });
            }}
            className="flex items-center gap-1.5 text-xs text-dark-subtext hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <RotateCcw size={12} />
            <span>Refazer Bateria</span>
          </button>
        )}
      </div>

      {/* Lista de Questões */}
      {safeQuestions.map((q, qIndex) => {
        const isOpen = q.type === 'open';
        const isEvaluating = evaluatingIds[q.id] || false;

        const isWin = !isOpen
          ? q.answered && q.selectedIndex === q.correctIndex
          : q.answered && q.aiFeedback?.verdict === 'Correto';
        const isPartial = isOpen && q.answered && q.aiFeedback?.verdict === 'Parcial';
        const isLoss = q.answered && !isWin && !isPartial;

        const hasGabarito = Boolean(
          q.explanation ||
          (isOpen && q.expectedAnswer) ||
          (!isOpen && typeof q.correctIndex === 'number')
        );

        const optionsList = Array.isArray(q.options) ? q.options : [];

        return (
          <div
            key={q.id}
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'g' || e.key === 'G') && (e.altKey || e.ctrlKey)) {
                e.preventDefault();
                e.stopPropagation();
                onUpdateSingleQuestion(q.id, { showExplanation: !q.showExplanation });
              }
            }}
            className={`p-5 rounded-2xl border transition-all space-y-4 focus:outline-none focus:border-purple-500/50 ${
              q.answered
                ? isWin
                  ? 'bg-green-950/10 border-green-500/30'
                  : isPartial
                    ? 'bg-amber-950/10 border-amber-500/30'
                    : 'bg-red-950/10 border-red-500/30'
                : 'bg-black/40 border-purple-500/20'
            }`}
          >
            {/* Header da Questão */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold font-mono">
                  {qIndex + 1}
                </span>
                <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">
                  {isOpen ? 'Questão Aberta' : 'Múltipla Escolha'}
                </span>

                {/* BOTÃO DISCRETO DE EMOJI DO GABARITO NO TOPO ESQUERDO DO CARD */}
                {hasGabarito && (
                  <button
                    onClick={() =>
                      onUpdateSingleQuestion(q.id, { showExplanation: !q.showExplanation })
                    }
                    className={`px-1.5 py-0.5 rounded-md transition-all flex items-center justify-center border text-xs leading-none ${
                      q.showExplanation
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm ring-1 ring-amber-500/30'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-dark-subtext hover:text-amber-300'
                    }`}
                    title={
                      q.showExplanation
                        ? 'Ocultar Gabarito / Explicação (Alt+G)'
                        : '💡 Consultar Gabarito de Referência (Alt+G)'
                    }
                  >
                    <span className="text-[12px]">💡</span>
                  </button>
                )}
              </div>

              {q.tags && q.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {q.tags.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-0.5"
                    >
                      <Tag size={9} />
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Enunciado */}
            <div className="text-xs text-purple-100 font-medium leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents as any}
              >
                {preprocessMarkdownCode(q.question || '')}
              </ReactMarkdown>
            </div>

            {/* Alternativas (Múltipla Escolha) */}
            {!isOpen && (
              <div className="space-y-2">
                {optionsList.map((opt, optIndex) => {
                  const letter = String.fromCharCode(65 + optIndex);
                  const isSelected = q.selectedIndex === optIndex;
                  const isCorrect = q.correctIndex === optIndex;

                  let optClass = 'bg-black/30 border-white/10 hover:border-purple-500/40 text-purple-100';
                  if (q.answered) {
                    if (isCorrect) {
                      optClass = 'bg-green-500/20 border-green-500 text-green-200 shadow-md shadow-green-500/10';
                    } else if (isSelected && !isCorrect) {
                      optClass = 'bg-red-500/20 border-red-500 text-red-200 shadow-md shadow-red-500/10';
                    } else {
                      optClass = 'bg-black/20 border-white/5 opacity-50 text-purple-200';
                    }
                  } else if (isSelected) {
                    optClass = 'bg-purple-600/30 border-purple-500 text-white';
                  }

                  return (
                    <div
                      key={optIndex}
                      role="button"
                      tabIndex={q.answered ? -1 : 0}
                      aria-disabled={q.answered}
                      onClick={() => {
                        if (q.answered) return;
                        const newAttempt: AttemptItem = {
                          id: `att_${Date.now()}`,
                          timestamp: Date.now(),
                          type: 'multiple_choice',
                          selectedIndex: optIndex,
                          isCorrect: optIndex === q.correctIndex,
                        };
                        onUpdateSingleQuestion(q.id, {
                          selectedIndex: optIndex,
                          answered: true,
                          showExplanation: true,
                          attemptsHistory: [newAttempt, ...(q.attemptsHistory || [])],
                        });
                      }}
                      onKeyDown={(e) => {
                        if (q.answered) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          const newAttempt: AttemptItem = {
                            id: `att_${Date.now()}`,
                            timestamp: Date.now(),
                            type: 'multiple_choice',
                            selectedIndex: optIndex,
                            isCorrect: optIndex === q.correctIndex,
                          };
                          onUpdateSingleQuestion(q.id, {
                            selectedIndex: optIndex,
                            answered: true,
                            showExplanation: true,
                            attemptsHistory: [newAttempt, ...(q.attemptsHistory || [])],
                          });
                        }
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-start gap-3 transition-all select-none ${optClass} ${
                        q.answered ? 'cursor-default' : 'cursor-pointer hover:scale-[1.005]'
                      }`}
                    >
                      <span className="w-6 h-6 rounded-lg bg-black/40 flex items-center justify-center text-xs font-bold font-mono shrink-0">
                        {letter}
                      </span>
                      <div className="text-xs flex-1 pt-0.5 leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={markdownComponents as any}
                        >
                          {preprocessMarkdownCode(opt || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Resposta Aberta */}
            {isOpen && (
              <div className="space-y-3">
                <textarea
                  value={q.userTypedAnswer || ''}
                  disabled={q.answered || isEvaluating}
                  onChange={(e) =>
                    onUpdateSingleQuestion(q.id, { userTypedAnswer: e.target.value })
                  }
                  onKeyDown={(e) => {
                    e.stopPropagation();

                    // Alt+G ou Ctrl+G para alternar (abrir/fechar) o Gabarito
                    if ((e.key === 'g' || e.key === 'G') && (e.altKey || e.ctrlKey)) {
                      e.preventDefault();
                      onUpdateSingleQuestion(q.id, { showExplanation: !q.showExplanation });
                      return;
                    }

                    // Enter submete a resposta para avaliação (Shift+Enter insere quebra de linha)
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (
                        q.userTypedAnswer &&
                        q.userTypedAnswer.trim() &&
                        !q.answered &&
                        !isEvaluating
                      ) {
                        onEvaluateOpenAnswer(q, qIndex);
                      }
                    }
                  }}
                  placeholder="Escreva sua resposta detalhada aqui... (Enter para enviar | Alt+G para Gabarito)"
                  className="w-full bg-black/40 border border-purple-500/20 focus:border-purple-500/50 rounded-xl p-3 text-xs text-purple-100 placeholder-white/25 outline-none resize-y min-h-[80px] leading-relaxed transition-colors disabled:opacity-75"
                  rows={3}
                />

                {!q.answered && (
                  <button
                    onClick={() => onEvaluateOpenAnswer(q, qIndex)}
                    disabled={isEvaluating || !q.userTypedAnswer?.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2"
                  >
                    {isEvaluating ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    <span>{isEvaluating ? 'Avaliando com IA...' : 'Avaliar Resposta com IA'}</span>
                  </button>
                )}

                {q.answered && q.aiFeedback && (
                  <div
                    className={`p-3.5 rounded-xl border space-y-2 text-xs leading-relaxed ${
                      isWin
                        ? 'bg-green-500/10 border-green-500/30 text-green-200'
                        : isPartial
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                          : 'bg-red-500/10 border-red-500/30 text-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5">
                        {isWin && <CheckCircle2 size={15} className="text-green-400" />}
                        {isPartial && <Sparkles size={15} className="text-amber-400" />}
                        {isLoss && <XCircle size={15} className="text-red-400" />}
                        <span>Parecer da IA: {q.aiFeedback.verdict}</span>
                      </span>
                      <button
                        onClick={() => onDiscussInChat(q, qIndex)}
                        className="text-[11px] font-semibold text-purple-300 hover:text-purple-200 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/5 transition-colors"
                      >
                        <MessageSquare size={12} />
                        <span>Discutir no Chat</span>
                      </button>
                    </div>
                    <p className="opacity-90">{q.aiFeedback.feedback}</p>
                  </div>
                )}
              </div>
            )}

            {/* Ações após responder (Explicação / Refazer) */}
            {q.answered && (
              <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onUpdateSingleQuestion(q.id, { showExplanation: !q.showExplanation })
                    }
                    className="text-xs text-purple-300 hover:text-purple-200 font-semibold flex items-center gap-1 px-2.5 py-1 rounded hover:bg-white/5 transition-colors"
                  >
                    <span>{q.showExplanation ? 'Ocultar Gabarito' : '💡 Ver Gabarito / Explicação'}</span>
                    {q.showExplanation ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  <button
                    onClick={() => {
                      onUpdateSingleQuestion(q.id, {
                        answered: false,
                        selectedIndex: null,
                        userTypedAnswer: '',
                        aiFeedback: null,
                        showExplanation: false,
                      });
                    }}
                    className="text-xs text-dark-subtext hover:text-white flex items-center gap-1 px-2.5 py-1 rounded hover:bg-white/5 transition-colors"
                  >
                    <RotateCcw size={12} />
                    <span>Tentar Novamente</span>
                  </button>
                </div>
              </div>
            )}

            {/* Painel do Gabarito e Explicação Expandido */}
            {q.showExplanation && (
              <div className="p-4 bg-purple-950/30 border border-purple-500/20 rounded-xl text-xs text-purple-100 leading-relaxed space-y-3 shadow-inner">
                {/* Resposta Esperada para Questão Aberta */}
                {isOpen && q.expectedAnswer && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                      📌 Resposta Esperada / Gabarito:
                    </span>
                    <div className="text-xs text-purple-100 opacity-95">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents as any}
                      >
                        {preprocessMarkdownCode(q.expectedAnswer)}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Alternativa Correta para Múltipla Escolha */}
                {!isOpen && typeof q.correctIndex === 'number' && optionsList[q.correctIndex] !== undefined && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-green-300 flex items-center gap-1.5 uppercase tracking-wider">
                      ✓ Alternativa Correta: {String.fromCharCode(65 + q.correctIndex)}) {optionsList[q.correctIndex] || ''}
                    </span>
                  </div>
                )}

                {/* Explicação Pedagógica */}
                {q.explanation && (
                  <div className={`space-y-1 ${isOpen && q.expectedAnswer ? 'pt-2 border-t border-purple-500/20' : ''}`}>
                    <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
                      💡 Explicação do Gabarito:
                    </span>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents as any}
                    >
                      {preprocessMarkdownCode(q.explanation)}
                    </ReactMarkdown>
                  </div>
                )}

                {/* Caso não haja gabarito nem explicação cadastrados */}
                {!q.explanation && !(isOpen && q.expectedAnswer) && !(!isOpen && typeof q.correctIndex === 'number') && (
                  <span className="text-dark-subtext italic">Nenhum gabarito ou explicação cadastrado para esta questão.</span>
                )}
              </div>
            )}

            {/* Histórico */}
            <QuizHistorySection question={q} />
          </div>
        );
      })}
    </div>
  );
}

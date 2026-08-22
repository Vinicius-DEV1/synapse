import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Trophy,
  List,
  Loader2,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { triggerFireworksAnimation } from '../utils/fireworks';
import { markdownComponents, preprocessMarkdownCode } from '../utils/markdownPreprocess';
import type { QuestionItem } from '../types';

interface QuizSequentialPlayerProps {
  questions: QuestionItem[];
  onUpdateSingleQuestion: (qId: string, partial: Partial<QuestionItem>, immediate?: boolean) => void;
  onEvaluateOpenAnswer: (q: QuestionItem, index: number) => Promise<void> | void;
  evaluatingIds: Record<string, boolean>;
  onDiscussInChat: (q: QuestionItem, index: number) => void;
  onSwitchToListLayout?: () => void;
}

export default function QuizSequentialPlayer({
  questions,
  onUpdateSingleQuestion,
  onEvaluateOpenAnswer,
  evaluatingIds,
  onDiscussInChat,
  onSwitchToListLayout,
}: QuizSequentialPlayerProps) {
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const total = safeQuestions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSummaryView, setShowSummaryView] = useState(false);

  // Garante que o índice esteja dentro dos limites válidos
  const activeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, total - 1));
  const currentQ = safeQuestions[activeIndex];

  const answeredCount = safeQuestions.filter((q) => q.answered).length;
  const correctCount = safeQuestions.filter((q) => {
    if (!q.answered) return false;
    if (q.type === 'multiple_choice') return q.selectedIndex === q.correctIndex;
    return q.aiFeedback?.verdict === 'Correto';
  }).length;

  const hitPercentage = answeredCount > 0 ? Math.round((correctCount / total) * 100) : 0;
  const allAnswered = total > 0 && answeredCount === total;

  // Dispara celebração quando todas as questões forem respondidas com bom aproveitamento
  useEffect(() => {
    if (allAnswered && hitPercentage >= 70) {
      triggerFireworksAnimation();
    }
  }, [allAnswered, hitPercentage]);

  // Navega para a próxima questão
  const handleNext = useCallback(() => {
    if (activeIndex < total - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowSummaryView(true);
    }
  }, [activeIndex, total]);

  // Navega para a questão anterior
  const handlePrev = useCallback(() => {
    if (showSummaryView) {
      setShowSummaryView(false);
      setCurrentIndex(total - 1);
    } else if (activeIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [showSummaryView, activeIndex, total]);

  // Responde questão de múltipla escolha
  const handleSelectOption = useCallback(
    (index: number) => {
      if (!currentQ || currentQ.answered) return;
      const isCorrect = index === currentQ.correctIndex;
      const attempt = {
        id: `att_${Date.now()}`,
        timestamp: Date.now(),
        type: 'multiple_choice' as const,
        selectedIndex: index,
        isCorrect,
      };

      onUpdateSingleQuestion(
        currentQ.id,
        {
          selectedIndex: index,
          answered: true,
          attemptsHistory: [attempt, ...(currentQ.attemptsHistory || [])],
        },
        true
      );
    },
    [currentQ, onUpdateSingleQuestion]
  );

  // Reinicia a questão atual
  const handleResetCurrent = useCallback(() => {
    if (!currentQ) return;
    onUpdateSingleQuestion(
      currentQ.id,
      {
        answered: false,
        selectedIndex: null,
        userTypedAnswer: '',
        aiFeedback: null,
        showExplanation: false,
      },
      true
    );
  }, [currentQ, onUpdateSingleQuestion]);

  // Reinicia todas as questões da bateria
  const handleResetAll = useCallback(() => {
    safeQuestions.forEach((q) => {
      onUpdateSingleQuestion(
        q.id,
        {
          answered: false,
          selectedIndex: null,
          userTypedAnswer: '',
          aiFeedback: null,
          showExplanation: false,
        },
        true
      );
    });
    setCurrentIndex(0);
    setShowSummaryView(false);
  }, [safeQuestions, onUpdateSingleQuestion]);

  // Atalhos de teclado no modo interativo (Setas, Enter, Números 1-4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        activeEl?.getAttribute('contenteditable') === 'true';

      if (isTyping && activeEl?.tagName === 'TEXTAREA') {
        // Se estiver digitando em textarea aberta, não intercepta atalhos
        return;
      }

      if (e.key === 'ArrowRight' || (e.key === 'Enter' && currentQ?.answered)) {
        if (!showSummaryView) {
          e.preventDefault();
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (!currentQ?.answered && currentQ?.type === 'multiple_choice') {
        const keyNum = parseInt(e.key, 10);
        if (keyNum >= 1 && keyNum <= (currentQ.options?.length || 0)) {
          e.preventDefault();
          handleSelectOption(keyNum - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleSelectOption, currentQ, showSummaryView]);

  if (total === 0) {
    return (
      <div className="p-8 text-center bg-white/5 border border-white/10 rounded-2xl text-dark-subtext">
        <HelpCircle size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Nenhuma questão cadastrada nesta bateria.</p>
      </div>
    );
  }

  // TELA DE RESUMO FINAL
  if (showSummaryView) {
    return (
      <div className="p-6 md:p-8 bg-dark-bg/60 border border-white/10 rounded-2xl space-y-6 animate-scale-in">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center mx-auto text-brand-400 shadow-xl shadow-brand-500/10">
            <Trophy size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Bateria Concluída!</h3>
            <p className="text-xs text-dark-subtext mt-1">
              Confira seu desempenho geral neste bloco de exercícios:
            </p>
          </div>

          <div className="inline-flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 my-2">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-dark-subtext block">Acertos</span>
              <span className="text-2xl font-bold text-white font-mono">
                {correctCount} <span className="text-sm text-dark-subtext">/ {total}</span>
              </span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-dark-subtext block">Aproveitamento</span>
              <span
                className={`text-2xl font-bold font-mono ${
                  hitPercentage >= 70
                    ? 'text-green-400'
                    : hitPercentage >= 50
                      ? 'text-amber-400'
                      : 'text-red-400'
                }`}
              >
                {hitPercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Resumo Rápido de Questões */}
        <div className="space-y-2 max-w-xl mx-auto pt-2 border-t border-white/5">
          <span className="text-xs font-bold text-dark-subtext uppercase tracking-wider block">
            Questões Respondidas:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {safeQuestions.map((q, idx) => {
              const isCorrect =
                q.type === 'multiple_choice'
                  ? q.selectedIndex === q.correctIndex
                  : q.aiFeedback?.verdict === 'Correto';
              const isPartial = q.type === 'open' && q.aiFeedback?.verdict === 'Parcial';

              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setShowSummaryView(false);
                    setCurrentIndex(idx);
                  }}
                  className={`p-2.5 rounded-xl border text-left text-xs flex items-center justify-between gap-2 transition-all hover:scale-[1.01] ${
                    isCorrect
                      ? 'bg-green-500/10 border-green-500/30 text-green-200'
                      : isPartial
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-red-500/10 border-red-500/30 text-red-200'
                  }`}
                >
                  <span className="font-semibold truncate">
                    #{idx + 1}. {q.question || 'Sem enunciado'}
                  </span>
                  <span className="shrink-0 text-xs">
                    {isCorrect ? '✓' : isPartial ? '≈' : '✕'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ações Finais */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-white/5">
          <button
            onClick={handleResetAll}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
          >
            <RotateCcw size={14} />
            <span>Refazer Bateria</span>
          </button>

          {onSwitchToListLayout && (
            <button
              onClick={onSwitchToListLayout}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-brand-200 border border-white/10 rounded-xl text-xs font-medium transition-colors"
            >
              <List size={14} />
              <span>Ver em Lista Completa</span>
            </button>
          )}

          <button
            onClick={() => {
              setShowSummaryView(false);
              setCurrentIndex(0);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white border border-white/10 rounded-xl text-xs font-medium transition-colors"
          >
            <span>Revisar desde a Questão 1</span>
          </button>
        </div>
      </div>
    );
  }

  // TELA DE PRÁTICA SEQUENCIAL (QUESTÃO EM FOCO)
  const isEvaluating = evaluatingIds[currentQ.id] || false;
  const isOpenType = currentQ.type === 'open';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Barra de Progresso e Steppers */}
      <div className="p-4 bg-dark-bg/60 border border-white/10 rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2 font-semibold text-white">
            <span className="px-2 py-0.5 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-mono font-bold">
              {activeIndex + 1} / {total}
            </span>
            <span className="text-dark-subtext font-normal">
              {isOpenType ? 'Questão Aberta (Discursiva)' : 'Múltipla Escolha'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-dark-subtext">
              Respondidas: <strong className="text-white font-mono">{answeredCount}/{total}</strong>
            </span>
            {answeredCount > 0 && (
              <span className="text-green-400 font-mono font-semibold">
                {correctCount} {correctCount === 1 ? 'acerto' : 'acertos'}
              </span>
            )}
          </div>
        </div>

        {/* Steppers Clicáveis */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 pt-1">
          {safeQuestions.map((q, idx) => {
            const isCurrent = idx === activeIndex;
            const isAnswered = q.answered;
            const isCorrect =
              q.type === 'multiple_choice'
                ? q.selectedIndex === q.correctIndex
                : q.aiFeedback?.verdict === 'Correto';
            const isPartial = q.type === 'open' && q.aiFeedback?.verdict === 'Parcial';

            let pillClass = 'bg-white/5 border-white/10 text-dark-subtext hover:text-white hover:bg-white/10';
            if (isAnswered) {
              if (isCorrect) {
                pillClass = 'bg-green-500/20 border-green-500/40 text-green-300';
              } else if (isPartial) {
                pillClass = 'bg-amber-500/20 border-amber-500/40 text-amber-300';
              } else {
                pillClass = 'bg-red-500/20 border-red-500/40 text-red-300';
              }
            }

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-7 h-7 rounded-xl border text-xs font-mono font-bold flex items-center justify-center transition-all shrink-0 ${pillClass} ${
                  isCurrent ? 'ring-2 ring-brand-500 scale-110 shadow-md font-bold' : ''
                }`}
                title={`Ir para questão ${idx + 1}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card da Questão Atual */}
      <div className="p-5 md:p-7 bg-dark-bg/70 border border-white/10 rounded-2xl space-y-5 shadow-lg relative">
        {/* Header do Card (Tags, Feedback Verdict & Gabarito) */}
        <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-brand-300 bg-brand-500/10 px-2.5 py-0.5 rounded-lg border border-brand-500/20">
              Questão {activeIndex + 1}
            </span>

            {/* Tags */}
            {currentQ.tags && currentQ.tags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                {currentQ.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-dark-subtext"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Status / Veredicto */}
          <div className="flex items-center gap-2">
            {currentQ.answered && (
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  currentQ.type === 'multiple_choice'
                    ? currentQ.selectedIndex === currentQ.correctIndex
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : currentQ.aiFeedback?.verdict === 'Correto'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : currentQ.aiFeedback?.verdict === 'Parcial'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {currentQ.type === 'multiple_choice' ? (
                  currentQ.selectedIndex === currentQ.correctIndex ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>Correto</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={13} />
                      <span>Incorreto</span>
                    </>
                  )
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>{currentQ.aiFeedback?.verdict || 'Avaliada'}</span>
                  </>
                )}
              </span>
            )}

            {/* Botão Ver Gabarito */}
            {(currentQ.explanation || (currentQ.type === 'open' && currentQ.expectedAnswer)) && (
              <button
                onClick={() =>
                  onUpdateSingleQuestion(
                    currentQ.id,
                    { showExplanation: !currentQ.showExplanation },
                    true
                  )
                }
                className={`p-1.5 rounded-lg border text-xs transition-colors flex items-center gap-1 ${
                  currentQ.showExplanation
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-dark-subtext hover:text-white'
                }`}
                title="Ver/ocultar explicação e gabarito (Alt+G)"
              >
                <HelpCircle size={14} />
                <span className="text-[11px] hidden sm:inline">Gabarito</span>
              </button>
            )}
          </div>
        </div>

        {/* Enunciado */}
        <div className="text-sm md:text-base font-semibold text-white leading-relaxed">
          {currentQ.question ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
              {preprocessMarkdownCode(currentQ.question)}
            </ReactMarkdown>
          ) : (
            <span className="italic text-dark-subtext">Questão sem enunciado cadastrado.</span>
          )}
        </div>

        {/* OPÇÕES: MÚLTIPLA ESCOLHA (Kahoot Style) */}
        {!isOpenType && currentQ.options && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {currentQ.options.map((opt, optIndex) => {
              const letter = String.fromCharCode(65 + optIndex);
              const isSelected = currentQ.selectedIndex === optIndex;
              const isCorrect = optIndex === currentQ.correctIndex;

              let style =
                'bg-white/5 border-white/10 hover:border-brand-500/40 text-white/90 hover:bg-white/10';

              if (currentQ.answered) {
                if (isCorrect) {
                  style =
                    'bg-green-500/20 border-green-500/60 text-green-100 font-semibold shadow-md shadow-green-950/40';
                } else if (isSelected && !isCorrect) {
                  style =
                    'bg-red-500/20 border-red-500/60 text-red-200 line-through opacity-80';
                } else {
                  style = 'bg-black/20 border-white/5 text-dark-subtext opacity-40';
                }
              } else if (isSelected) {
                style = 'bg-brand-500/20 border-brand-500 text-white font-semibold';
              }

              return (
                <button
                  key={optIndex}
                  onClick={() => handleSelectOption(optIndex)}
                  disabled={currentQ.answered}
                  className={`p-4 rounded-2xl border text-xs md:text-sm text-left flex items-center gap-3.5 transition-all cursor-pointer disabled:cursor-default ${style}`}
                >
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                      isSelected
                        ? 'bg-brand-500 border-brand-400 text-white shadow-sm'
                        : 'border-white/10 bg-black/40 text-dark-subtext'
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="flex-1 leading-relaxed">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
                      {preprocessMarkdownCode(opt || `Opção ${letter}`)}
                    </ReactMarkdown>
                  </span>
                  {currentQ.answered && isCorrect && (
                    <Check size={18} className="text-green-400 shrink-0" />
                  )}
                  {currentQ.answered && isSelected && !isCorrect && (
                    <X size={18} className="text-red-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* OPÇÕES: QUESTÃO ABERTA */}
        {isOpenType && (
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-dark-subtext flex items-center justify-between">
                <span>✍️ Sua Resposta Discursiva:</span>
                <span className="text-[10px] opacity-70">Pressione Enter para enviar para avaliação</span>
              </label>
              <textarea
                value={currentQ.userTypedAnswer || ''}
                onChange={(e) =>
                  onUpdateSingleQuestion(currentQ.id, { userTypedAnswer: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (currentQ.userTypedAnswer?.trim() && !currentQ.answered && !isEvaluating) {
                      onEvaluateOpenAnswer(currentQ, activeIndex);
                    }
                  }
                }}
                disabled={currentQ.answered || isEvaluating}
                placeholder="Escreva sua resposta completa com clareza..."
                rows={4}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs md:text-sm text-white placeholder-white/20 outline-none focus:border-brand-500 resize-none transition-colors"
              />
            </div>

            {!currentQ.answered && (
              <button
                onClick={() => onEvaluateOpenAnswer(currentQ, activeIndex)}
                disabled={!currentQ.userTypedAnswer?.trim() || isEvaluating}
                className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-brand-500/20"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Avaliando com IA do Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Enviar Resposta para Avaliação IA</span>
                  </>
                )}
              </button>
            )}

            {/* Parecer da IA */}
            {currentQ.answered && currentQ.aiFeedback && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  currentQ.aiFeedback.verdict === 'Correto'
                    ? 'bg-green-500/10 border-green-500/30 text-green-200'
                    : currentQ.aiFeedback.verdict === 'Parcial'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-red-500/10 border-red-500/30 text-red-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>Avaliação: {currentQ.aiFeedback.verdict}</span>
                  </span>
                  <span className="text-[10px] opacity-70 font-normal">Gemini AI</span>
                </div>
                <p className="leading-relaxed opacity-95">{currentQ.aiFeedback.feedback}</p>
                <div className="pt-2 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => onDiscussInChat(currentQ, activeIndex)}
                    className="text-[11px] font-semibold text-brand-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1.5"
                  >
                    <MessageSquare size={12} />
                    <span>Discutir com Assistente IA</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Caixa de Explicação / Gabarito Comentado */}
        {currentQ.showExplanation &&
          (currentQ.explanation || (isOpenType && currentQ.expectedAnswer)) && (
            <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 text-xs text-brand-100 space-y-2 shadow-inner">
              {isOpenType && currentQ.expectedAnswer && (
                <div className="space-y-1">
                  <span className="font-bold text-brand-300 text-[11px] block">
                    📌 Gabarito de Referência:
                  </span>
                  <p className="leading-relaxed opacity-90">{currentQ.expectedAnswer}</p>
                </div>
              )}
              {currentQ.explanation && (
                <div className="space-y-1">
                  <span className="font-bold text-brand-300 text-[11px] block">
                    💡 Explicação Detalhada:
                  </span>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
                    {preprocessMarkdownCode(currentQ.explanation)}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Barra Inferior de Navegação */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={handlePrev}
          disabled={activeIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-dark-subtext hover:text-white border border-white/10 rounded-xl text-xs font-medium transition-colors"
        >
          <ChevronLeft size={16} />
          <span>Anterior</span>
        </button>

        <div className="flex items-center gap-2">
          {currentQ.answered && (
            <button
              onClick={handleResetCurrent}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-dark-subtext hover:text-white border border-white/10 rounded-xl text-xs transition-colors"
              title="Tentar responder esta questão novamente"
            >
              <RotateCcw size={13} />
              <span>Tentar Novamente</span>
            </button>
          )}

          <button
            onClick={handleNext}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-md ${
              currentQ.answered
                ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-brand-500/20 ring-2 ring-brand-500/30'
                : 'bg-white/10 hover:bg-white/15 text-white'
            }`}
          >
            <span>{activeIndex === total - 1 ? 'Finalizar Bateria' : 'Próxima Questão'}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

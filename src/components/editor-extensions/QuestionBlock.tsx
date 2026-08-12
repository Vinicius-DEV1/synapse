import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { 
  Trash2, 
  Plus, 
  Sparkles, 
  RotateCcw, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  BookOpen, 
  Loader2, 
  ChevronDown, 
  ChevronRight,
  Trophy
} from 'lucide-react';
import { useState } from 'react';
import { 
  promptGeminiForOpenQuestionEvaluation, 
  promptGeminiToGenerateBatchQuestions 
} from '../../services/gemini';

export interface QuestionItem {
  id: string;
  type: 'multiple_choice' | 'open';
  question: string;
  options: string[];
  correctIndex: number;
  selectedIndex: number | null;
  expectedAnswer: string;
  userTypedAnswer: string;
  aiFeedback: { verdict: 'Correto' | 'Parcial' | 'Incorreto'; feedback: string } | null;
  explanation: string;
  showExplanation: boolean;
  answered: boolean;
}

const createDefaultQuestion = (idSuffix: number = 1): QuestionItem => ({
  id: `q_${Date.now()}_${idSuffix}`,
  type: 'multiple_choice',
  question: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  selectedIndex: null,
  expectedAnswer: '',
  userTypedAnswer: '',
  aiFeedback: null,
  explanation: '',
  showExplanation: false,
  answered: false,
});

const QuestionBlockComponent = (props: any) => {
  const { title, isCollapsed, questions: rawQuestions } = props.node.attrs;

  // Garante retrocompatibilidade se existirem nós salvos no formato antigo de única questão
  const initialQuestions: QuestionItem[] = Array.isArray(rawQuestions) && rawQuestions.length > 0 
    ? rawQuestions 
    : [
        props.node.attrs.question || props.node.attrs.options 
          ? {
              id: `q_legacy_${Date.now()}`,
              type: props.node.attrs.type || 'multiple_choice',
              question: props.node.attrs.question || '',
              options: props.node.attrs.options || ['', '', '', ''],
              correctIndex: props.node.attrs.correctIndex || 0,
              selectedIndex: props.node.attrs.selectedIndex ?? null,
              expectedAnswer: props.node.attrs.expectedAnswer || '',
              userTypedAnswer: props.node.attrs.userTypedAnswer || '',
              aiFeedback: props.node.attrs.aiFeedback || null,
              explanation: props.node.attrs.explanation || '',
              showExplanation: props.node.attrs.showExplanation || false,
              answered: props.node.attrs.answered || false,
            }
          : createDefaultQuestion(1)
      ];

  const questions: QuestionItem[] = initialQuestions;

  // Estados locais da UI
  const [evaluatingIds, setEvaluatingIds] = useState<Record<string, boolean>>({});
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [batchCountInput, setBatchCountInput] = useState(3);
  const [explanationEditors, setExplanationEditors] = useState<Record<string, boolean>>({});

  // Estados de confirmação de exclusão
  const [deletingQuestionInfo, setDeletingQuestionInfo] = useState<{ id: string; index: number } | null>(null);
  const [showDeleteContainerModal, setShowDeleteContainerModal] = useState(false);


  // Atualização genérica da lista de questões
  const updateQuestions = (newQuestions: QuestionItem[]) => {
    props.updateAttributes({ questions: newQuestions });
  };

  // Atualização genérica de um campo de uma única questão
  const updateSingleQuestion = (qId: string, partial: Partial<QuestionItem>) => {
    const updated = questions.map((q) => (q.id === qId ? { ...q, ...partial } : q));
    updateQuestions(updated);
  };

  // Handlers do Container (Header)
  const handleToggleCollapse = () => {
    props.updateAttributes({ isCollapsed: !isCollapsed });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.updateAttributes({ title: e.target.value });
  };

  const handleResetAll = () => {
    const resetList = questions.map((q) => ({
      ...q,
      answered: false,
      selectedIndex: null,
      aiFeedback: null,
      showExplanation: false,
    }));
    updateQuestions(resetList);
  };

  const handleAddQuestion = () => {
    const newQ = createDefaultQuestion(questions.length + 1);
    updateQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (qId: string) => {
    if (questions.length <= 1) {
      // Se tiver só 1, apenas reseta a questão em vez de deixar vazio
      updateQuestions([createDefaultQuestion(1)]);
      return;
    }
    updateQuestions(questions.filter((q) => q.id !== qId));
  };

  const handleDeleteContainer = () => {
    props.deleteNode();
  };

  // Handlers da Geração em Lote via IA
  const handleGenerateBatchWithAi = async () => {
    if (isGeneratingBatch) return;
    setIsGeneratingBatch(true);
    try {
      const promptText = aiPromptInput.trim() || title || 'Bateria de exercícios de fixação';
      const result = await promptGeminiToGenerateBatchQuestions(promptText, batchCountInput);

      const generatedQuestions: QuestionItem[] = result.map((item, idx) => ({
        id: `q_ai_${Date.now()}_${idx}`,
        type: item.type || 'multiple_choice',
        question: item.question || '',
        options: item.options && item.options.length >= 2 ? item.options : ['', '', '', ''],
        correctIndex: typeof item.correctIndex === 'number' ? item.correctIndex : 0,
        selectedIndex: null,
        expectedAnswer: item.expectedAnswer || '',
        userTypedAnswer: '',
        aiFeedback: null,
        explanation: item.explanation || '',
        showExplanation: false,
        answered: false,
      }));

      if (generatedQuestions.length > 0) {
        updateQuestions(generatedQuestions);
        setShowAiModal(false);
        setAiPromptInput('');
      }
    } catch (err) {
      console.error('Erro ao gerar bateria com IA:', err);
      alert('Não foi possível gerar a bateria de questões no momento. Tente novamente.');
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Handlers de Avaliação de Questão Aberta por IA
  const handleEvaluateOpenQuestion = async (q: QuestionItem) => {
    if (!q.userTypedAnswer || !q.userTypedAnswer.trim() || evaluatingIds[q.id]) return;
    setEvaluatingIds((prev) => ({ ...prev, [q.id]: true }));
    try {
      const result = await promptGeminiForOpenQuestionEvaluation(
        q.question || 'Questão sem enunciado',
        q.expectedAnswer || 'Gabarito não cadastrado',
        q.userTypedAnswer
      );
      updateSingleQuestion(q.id, {
        aiFeedback: result,
        answered: true,
      });
    } catch (err) {
      console.error('Erro ao avaliar questão aberta:', err);
      alert('Não foi possível avaliar sua resposta no momento.');
    } finally {
      setEvaluatingIds((prev) => ({ ...prev, [q.id]: false }));
    }
  };

  // Cálculo de Estatísticas / Métricas em tempo real
  const totalQuestions = questions.length;
  const answeredQuestions = questions.filter((q) => q.answered).length;
  const correctCount = questions.filter((q) => {
    if (!q.answered) return false;
    if (q.type === 'multiple_choice') {
      return q.selectedIndex === q.correctIndex;
    }
    return q.aiFeedback?.verdict === 'Correto';
  }).length;

  const scorePercentage = answeredQuestions > 0 ? Math.round((correctCount / answeredQuestions) * 100) : 0;

  return (
    <NodeViewWrapper className="question-block relative bg-dark-card border border-white/10 rounded-xl p-4 my-6 shadow-md block transition-all">
      {/* HEADER DO CONTAINER */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          {/* Botão de Seta para Esconder/Expandir */}
          <button
            onClick={handleToggleCollapse}
            className="p-1.5 text-brand-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            title={isCollapsed ? 'Expandir Bateria de Questões' : 'Recolher Bateria de Questões'}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </button>

          <HelpCircle size={18} className="text-brand-400 shrink-0" />

          {/* Título da Bateria Editável */}
          <input
            type="text"
            value={title || 'Bateria de Exercícios'}
            onChange={handleTitleChange}
            placeholder="Nome da Bateria de Exercícios..."
            className="bg-transparent text-base font-bold text-brand-100 placeholder-white/30 outline-none focus:bg-white/5 px-2 py-0.5 rounded flex-1 min-w-[150px]"
          />
        </div>

        {/* Métrica / Placar Badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-dark-bg/80 border border-white/10 px-2.5 py-1 rounded-full text-xs font-medium">
            <Trophy size={13} className={correctCount > 0 ? 'text-amber-400' : 'text-dark-subtext'} />
            <span className="text-brand-100">
              {answeredQuestions}/{totalQuestions} Respondidas
            </span>
            {answeredQuestions > 0 && (
              <span className={`ml-1 font-bold ${scorePercentage >= 70 ? 'text-green-400' : 'text-amber-400'}`}>
                ({scorePercentage}% Acertos)
              </span>
            )}
          </div>

          {/* Botão Refazer Tudo */}
          {answeredQuestions > 0 && (
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 rounded-md font-medium transition-colors"
              title="Resetar respostas de todas as questões desta bateria"
            >
              <RotateCcw size={13} />
              <span>Refazer Tudo</span>
            </button>
          )}

          {/* Botão Gerar Bateria com IA */}
          <button
            onClick={() => setShowAiModal(!showAiModal)}
            disabled={isGeneratingBatch}
            className="flex items-center gap-1 text-xs px-2.5 py-1 bg-gradient-to-r from-purple-500/20 to-brand-500/20 hover:from-purple-500/30 hover:to-brand-500/30 text-purple-300 rounded-md border border-purple-500/30 font-medium transition-all"
            title="Gerar bateria inteira de questões via IA"
          >
            {isGeneratingBatch ? (
              <Loader2 size={13} className="animate-spin text-purple-400" />
            ) : (
              <Sparkles size={13} className="text-purple-400" />
            )}
            <span>{isGeneratingBatch ? 'Gerando...' : '✨ Gerar Bateria com IA'}</span>
          </button>

          {/* Deletar Bloco Container Inteiro */}
          <button
            onClick={() => setShowDeleteContainerModal(true)}
            className="p-1.5 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded-md transition-colors"
            title="Deletar Bateria de Questões"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* MODAL / POPOVER DE GERAÇÃO EM LOTE DA IA */}
      {showAiModal && (
        <div className="mt-3 p-3.5 bg-purple-950/40 border border-purple-500/30 rounded-xl text-xs space-y-2.5">
          <div className="flex items-center justify-between text-purple-200 font-medium">
            <span className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-purple-400" />
              Gerar Bateria de Exercícios com IA
            </span>
            <button onClick={() => setShowAiModal(false)} className="text-white/50 hover:text-white">
              ✕
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={aiPromptInput}
              onChange={(e) => setAiPromptInput(e.target.value)}
              placeholder="Digite o assunto (ex: 'Ciclo de Krebs e Fosforilação Oxidativa')..."
              className="flex-1 px-3 py-1.5 bg-black/40 border border-purple-500/20 rounded text-brand-100 placeholder-white/30 outline-none focus:border-purple-400"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerateBatchWithAi()}
            />
            <select
              value={batchCountInput}
              onChange={(e) => setBatchCountInput(Number(e.target.value))}
              className="bg-black/40 border border-purple-500/20 text-brand-100 rounded px-2 text-xs outline-none cursor-pointer"
            >
              <option value={2}>2 Questões</option>
              <option value={3}>3 Questões</option>
              <option value={5}>5 Questões</option>
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAiModal(false)} className="px-2.5 py-1 rounded text-dark-subtext hover:text-white">
              Cancelar
            </button>
            <button
              onClick={handleGenerateBatchWithAi}
              disabled={isGeneratingBatch}
              className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded flex items-center gap-1"
            >
              {isGeneratingBatch && <Loader2 size={12} className="animate-spin" />}
              Gerar {batchCountInput} Questões
            </button>
          </div>
        </div>
      )}

      {/* CORPO DO CONTAINER (RECOLHÍVEL QUANDO isCollapsed === true) */}
      {!isCollapsed && (
        <div className="mt-4 space-y-6">
          {questions.map((q, qIndex) => (
            <div
              key={q.id}
              className="bg-dark-bg/50 border border-white/10 rounded-xl p-4 relative group transition-all"
            >
              {/* Header da Sub-Questão */}
              <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-white/5 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
                    Questão {qIndex + 1}
                  </span>

                  {!q.answered && (
                    <div className="flex bg-black/30 p-0.5 rounded-lg border border-white/10 text-[11px]">
                      <button
                        onClick={() => updateSingleQuestion(q.id, { type: 'multiple_choice' })}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          q.type === 'multiple_choice'
                            ? 'bg-brand-500/30 text-brand-200 font-medium'
                            : 'text-dark-subtext hover:text-white'
                        }`}
                      >
                        Múltipla Escolha
                      </button>
                      <button
                        onClick={() => updateSingleQuestion(q.id, { type: 'open' })}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          q.type === 'open'
                            ? 'bg-brand-500/30 text-brand-200 font-medium'
                            : 'text-dark-subtext hover:text-white'
                        }`}
                      >
                        Questão Aberta
                      </button>
                    </div>
                  )}
                </div>

                {/* Remover esta questão específica */}
                <button
                  onClick={() => setDeletingQuestionInfo({ id: q.id, index: qIndex })}
                  className="p-1 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded transition-colors"
                  title="Remover esta questão"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Enunciado da Sub-Questão */}
              <textarea
                value={q.question}
                onChange={(e) => updateSingleQuestion(q.id, { question: e.target.value })}
                disabled={q.answered}
                placeholder="Escreva o enunciado da pergunta..."
                className="w-full bg-transparent text-base font-bold text-brand-100 placeholder-white/30 resize-none outline-none mb-3 focus:bg-white/5 rounded p-1 transition-colors disabled:opacity-90"
                rows={2}
              />

              {/* QUESTÃO TIPO MÚLTIPLA ESCOLHA */}
              {q.type === 'multiple_choice' && (
                <div className="flex flex-col gap-2 mb-3">
                  {q.options.map((opt: string, optIdx: number) => (
                    <div key={optIdx} className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name={`question-radio-${q.id}`}
                        checked={q.selectedIndex === optIdx}
                        onChange={() => !q.answered && updateSingleQuestion(q.id, { selectedIndex: optIdx })}
                        disabled={q.answered}
                        className="w-4 h-4 text-brand-500 focus:ring-brand-500 border-white/20 bg-dark-bg cursor-pointer disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...q.options];
                          newOpts[optIdx] = e.target.value;
                          updateSingleQuestion(q.id, { options: newOpts });
                        }}
                        disabled={q.answered}
                        placeholder={`Opção ${String.fromCharCode(65 + optIdx)}`}
                        className={`flex-1 bg-transparent outline-none transition-colors px-2.5 py-1 rounded text-xs ${
                          q.answered && optIdx === q.correctIndex
                            ? 'text-green-400 font-bold bg-green-500/10 border border-green-500/30'
                            : q.answered && q.selectedIndex === optIdx && optIdx !== q.correctIndex
                            ? 'text-red-400 line-through bg-red-500/10 border border-red-500/30'
                            : 'text-dark-text focus:bg-white/5 border border-transparent'
                        }`}
                      />

                      {!q.answered && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateSingleQuestion(q.id, { correctIndex: optIdx })}
                            className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                              q.correctIndex === optIdx
                                ? 'bg-green-500/20 text-green-400 font-medium border border-green-500/30'
                                : 'text-dark-subtext hover:bg-white/10'
                            }`}
                          >
                            {q.correctIndex === optIdx ? '✓ Correta' : 'Marcar Correta'}
                          </button>

                          {q.options.length > 2 && (
                            <button
                              onClick={() => {
                                const filtered = q.options.filter((_, i) => i !== optIdx);
                                let newCorr = q.correctIndex;
                                if (q.correctIndex === optIdx) newCorr = 0;
                                else if (q.correctIndex > optIdx) newCorr = q.correctIndex - 1;
                                updateSingleQuestion(q.id, { options: filtered, correctIndex: newCorr });
                              }}
                              className="p-1 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {!q.answered && q.options.length < 6 && (
                    <button
                      onClick={() => updateSingleQuestion(q.id, { options: [...q.options, ''] })}
                      className="self-start flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-medium mt-1 px-2 py-0.5 hover:bg-white/5 rounded"
                    >
                      <Plus size={13} />
                      <span>Adicionar Alternativa ({q.options.length}/6)</span>
                    </button>
                  )}
                </div>
              )}

              {/* QUESTÃO TIPO ABERTA */}
              {q.type === 'open' && (
                <div className="flex flex-col gap-2.5 mb-3">
                  {!q.answered && (
                    <div className="bg-black/30 border border-white/10 rounded-lg p-2.5">
                      <label className="block text-[11px] font-semibold text-brand-300 mb-1">
                        📌 Gabarito / Resposta Esperada (Autor):
                      </label>
                      <textarea
                        value={q.expectedAnswer}
                        onChange={(e) => updateSingleQuestion(q.id, { expectedAnswer: e.target.value })}
                        placeholder="Resposta correta esperada para a IA usar como gabarito..."
                        className="w-full bg-black/30 border border-white/10 rounded p-1.5 text-xs text-brand-100 placeholder-white/30 outline-none focus:border-brand-500 resize-none"
                        rows={2}
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-dark-subtext">✍️ Sua Resposta Discursiva:</label>
                    <textarea
                      value={q.userTypedAnswer}
                      onChange={(e) => updateSingleQuestion(q.id, { userTypedAnswer: e.target.value })}
                      disabled={q.answered || evaluatingIds[q.id]}
                      placeholder="Digite sua resposta..."
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-brand-100 placeholder-white/30 outline-none focus:border-brand-500 resize-none disabled:opacity-80"
                      rows={2}
                    />
                  </div>

                  {q.answered && q.aiFeedback && (
                    <div
                      className={`p-3 rounded-lg border text-xs space-y-1 ${
                        q.aiFeedback.verdict === 'Correto'
                          ? 'bg-green-500/10 border-green-500/30 text-green-300'
                          : q.aiFeedback.verdict === 'Parcial'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          : 'bg-red-500/10 border-red-500/30 text-red-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1">
                          {q.aiFeedback.verdict === 'Correto' && <CheckCircle2 size={16} className="text-green-400" />}
                          {q.aiFeedback.verdict === 'Parcial' && <AlertCircle size={16} className="text-amber-400" />}
                          {q.aiFeedback.verdict === 'Incorreto' && <XCircle size={16} className="text-red-400" />}
                          Avaliação da IA: {q.aiFeedback.verdict}
                        </span>
                        <span className="text-[10px] opacity-75 font-normal">✨ Gemini AI</span>
                      </div>
                      <p className="leading-relaxed opacity-95">{q.aiFeedback.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Explicação da Solução (Gabarito Comentado) */}
              {!q.answered && (
                <div className="mb-3">
                  <button
                    onClick={() =>
                      setExplanationEditors((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                    }
                    className="flex items-center gap-1 text-xs text-dark-subtext hover:text-brand-300 font-medium transition-colors"
                  >
                    <BookOpen size={13} />
                    <span>
                      {q.explanation ? '✏️ Editar Explicação / Gabarito Comentado' : '+ Adicionar Explicação / Gabarito Comentado'}
                    </span>
                  </button>

                  {explanationEditors[q.id] && (
                    <div className="mt-2 bg-black/30 border border-white/10 rounded-lg p-2">
                      <textarea
                        value={q.explanation}
                        onChange={(e) => updateSingleQuestion(q.id, { explanation: e.target.value })}
                        placeholder="Escreva a justificativa/explicação da resposta..."
                        className="w-full bg-transparent text-xs text-brand-100 placeholder-white/30 outline-none resize-none"
                        rows={2}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Botões da Sub-Questão: Responder / Refazer / Ver Explicação */}
              <div className="flex flex-col gap-2">
                {!q.answered ? (
                  q.type === 'multiple_choice' ? (
                    <button
                      onClick={() => q.selectedIndex !== null && updateSingleQuestion(q.id, { answered: true })}
                      disabled={q.selectedIndex === null}
                      className="w-full py-1.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                    >
                      Responder Questão {qIndex + 1}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEvaluateOpenQuestion(q)}
                      disabled={!q.userTypedAnswer || !q.userTypedAnswer.trim() || evaluatingIds[q.id]}
                      className="w-full py-1.5 bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
                    >
                      {evaluatingIds[q.id] ? (
                        <>
                          <Loader2 size={14} className="animate-spin text-purple-400" />
                          <span>Avaliando...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="text-purple-400" />
                          <span>Avaliar Resposta com IA</span>
                        </>
                      )}
                    </button>
                  )
                ) : (
                  <div className="flex items-center gap-2">
                    {q.explanation && (
                      <button
                        onClick={() => updateSingleQuestion(q.id, { showExplanation: !q.showExplanation })}
                        className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-brand-200 border border-white/10 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <BookOpen size={13} className="text-brand-400" />
                        <span>{q.showExplanation ? 'Ocultar Explicação' : '💡 Ver Explicação'}</span>
                      </button>
                    )}

                    <button
                      onClick={() =>
                        updateSingleQuestion(q.id, {
                          answered: false,
                          selectedIndex: null,
                          aiFeedback: null,
                          showExplanation: false,
                        })
                      }
                      className="flex-1 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 text-brand-300 border border-brand-500/30 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                    >
                      <RotateCcw size={13} />
                      <span>🔄 Tentar Novamente</span>
                    </button>
                  </div>
                )}

                {/* Explicação Revelada */}
                {q.answered && q.showExplanation && q.explanation && (
                  <div className="mt-1 p-2.5 bg-brand-950/30 border border-brand-500/30 rounded-lg text-xs text-brand-100 space-y-1">
                    <div className="font-semibold text-brand-300 flex items-center gap-1">
                      <BookOpen size={13} />
                      <span>Explicação / Gabarito Comentado:</span>
                    </div>
                    <p className="leading-relaxed opacity-90 whitespace-pre-wrap">{q.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Botão + Adicionar Questão na Bateria */}
          <button
            onClick={handleAddQuestion}
            className="w-full py-2.5 border-2 border-dashed border-white/10 hover:border-brand-500/40 text-brand-300 hover:text-white rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all bg-black/20 hover:bg-black/30"
          >
            <Plus size={16} />
            <span>Adicionar Nova Questão à Bateria</span>
          </button>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE SUB-QUESTÃO */}
      {deletingQuestionInfo && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setDeletingQuestionInfo(null)}
        >
          <div
            className="bg-dark-card border border-white/10 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-400 font-bold text-sm">
              <AlertCircle size={20} />
              <span>Excluir Questão {deletingQuestionInfo.index + 1}</span>
            </div>
            <p className="text-xs text-dark-subtext leading-relaxed">
              Tem certeza que deseja excluir esta questão da bateria? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2 text-xs pt-1">
              <button
                onClick={() => setDeletingQuestionInfo(null)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-brand-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleRemoveQuestion(deletingQuestionInfo.id);
                  setDeletingQuestionInfo(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DA BATERIA INTEIRA */}
      {showDeleteContainerModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowDeleteContainerModal(false)}
        >
          <div
            className="bg-dark-card border border-white/10 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-400 font-bold text-sm">
              <AlertCircle size={20} />
              <span>Excluir Bateria de Exercícios</span>
            </div>
            <p className="text-xs text-dark-subtext leading-relaxed">
              Tem certeza que deseja excluir toda a <strong>{title || 'Bateria de Exercícios'}</strong> ({questions.length}{' '}
              {questions.length === 1 ? 'questão' : 'questões'})? Todos os dados deste bloco serão removidos.
            </p>
            <div className="flex justify-end gap-2 text-xs pt-1">
              <button
                onClick={() => setShowDeleteContainerModal(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-brand-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleDeleteContainer();
                  setShowDeleteContainerModal(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
              >
                Sim, Excluir Bateria
              </button>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export const QuestionBlock = Node.create({
  name: 'questionBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      title: { default: 'Bateria de Exercícios' },
      isCollapsed: { default: false },
      questions: {
        default: [
          {
            id: `q_init_${Date.now()}`,
            type: 'multiple_choice',
            question: '',
            options: ['', '', '', ''],
            correctIndex: 0,
            selectedIndex: null,
            expectedAnswer: '',
            userTypedAnswer: '',
            aiFeedback: null,
            explanation: '',
            showExplanation: false,
            answered: false,
          },
        ],
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div.question-block' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'question-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuestionBlockComponent);
  },
});


import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
  Trophy,
  Send,
  Check,
  X,
  MessageSquare,
  Bot,
  User,
  CheckCheck
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { 
  promptGeminiForOpenQuestionEvaluation, 
  promptGeminiQuizAssistant 
} from '../../services/gemini';

export interface SuggestedAction {
  id: string;
  actionType: 'create' | 'edit' | 'delete';
  status: 'pending' | 'accepted' | 'rejected';
  // create
  type?: 'multiple_choice' | 'open';
  question?: string;
  options?: string[];
  correctIndex?: number;
  expectedAnswer?: string;
  explanation?: string;
  // edit / delete
  targetQuestionIndex?: number;
  changes?: {
    question?: string;
    options?: string[];
    correctIndex?: number;
    expectedAnswer?: string;
    explanation?: string;
  };
  reason?: string;
}

export interface QuizChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestedActions?: SuggestedAction[];
}

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
  const { title, isCollapsed, questions: rawQuestions, aiChatHistory: rawChatHistory } = props.node.attrs;

  // Garante retrocompatibilidade se existirem nós salvos no formato antigo
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
  const chatHistory: QuizChatMessage[] = Array.isArray(rawChatHistory) ? rawChatHistory : [];

  // Estados locais da UI
  const [evaluatingIds, setEvaluatingIds] = useState<Record<string, boolean>>({});
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [explanationEditors, setExplanationEditors] = useState<Record<string, boolean>>({});

  // Estados de confirmação de exclusão
  const [deletingQuestionInfo, setDeletingQuestionInfo] = useState<{ id: string; index: number } | null>(null);
  const [showDeleteContainerModal, setShowDeleteContainerModal] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showAiAssistantModal && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [showAiAssistantModal, chatHistory, isSendingChat]);

  // Atualizações genéricas
  const updateQuestions = (newQuestions: QuestionItem[]) => {
    props.updateAttributes({ questions: newQuestions });
  };

  const updateSingleQuestion = (qId: string, partial: Partial<QuestionItem>) => {
    const updated = questions.map((q) => (q.id === qId ? { ...q, ...partial } : q));
    updateQuestions(updated);
  };

  const updateChatHistory = (newHistory: QuizChatMessage[]) => {
    props.updateAttributes({ aiChatHistory: newHistory });
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
      updateQuestions([createDefaultQuestion(1)]);
      return;
    }
    updateQuestions(questions.filter((q) => q.id !== qId));
  };

  const handleDeleteContainer = () => {
    props.deleteNode();
  };

  // Handlers do Chat do Mini Assistente IA
  const handleSendChatMessage = async (overrideMessage?: string) => {
    const messageToSend = (overrideMessage || chatInput).trim();
    if (!messageToSend || isSendingChat) return;

    const userMsgId = `user_${Date.now()}`;
    const userMessageObj: QuizChatMessage = {
      id: userMsgId,
      role: 'user',
      text: messageToSend,
    };

    const updatedHistoryWithUser = [...chatHistory, userMessageObj];
    updateChatHistory(updatedHistoryWithUser);
    if (!overrideMessage) setChatInput('');
    setIsSendingChat(true);

    try {
      const response = await promptGeminiQuizAssistant(
        updatedHistoryWithUser.map((m) => ({ role: m.role, text: m.text })),
        questions,
        messageToSend
      );

      const assistantMsgId = `assistant_${Date.now()}`;
      const actions: SuggestedAction[] | undefined = response.suggestedActions?.map((a: any, idx: number) => ({
        id: `action_${Date.now()}_${idx}`,
        actionType: a.actionType,
        status: 'pending' as const,
        // create
        type: a.type || 'multiple_choice',
        question: a.question || '',
        options: a.options && a.options.length >= 2 ? a.options : ['', '', '', ''],
        correctIndex: typeof a.correctIndex === 'number' ? a.correctIndex : 0,
        expectedAnswer: a.expectedAnswer || '',
        explanation: a.explanation || '',
        // edit / delete
        targetQuestionIndex: a.targetQuestionIndex,
        changes: a.changes,
        reason: a.reason,
      }));

      const assistantMessageObj: QuizChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        text: response.message || 'Aqui estão as sugestões para a sua bateria:',
        suggestedActions: actions,
      };

      updateChatHistory([...updatedHistoryWithUser, assistantMessageObj]);
    } catch (err) {
      console.error('Erro ao chamar assistente de questões:', err);
      const errorMsg: QuizChatMessage = {
        id: `assistant_err_${Date.now()}`,
        role: 'assistant',
        text: 'Desculpe, ocorreu um erro ao se comunicar com a IA. Por favor, tente novamente.',
      };
      updateChatHistory([...updatedHistoryWithUser, errorMsg]);
    } finally {
      setIsSendingChat(false);
    }
  };

  // Handlers para os Cards de Ações Sugeridas (✓ / ✕)
  const handleActionStatusChange = (msgId: string, actionId: string, newStatus: 'accepted' | 'rejected' | 'pending') => {
    const updated = chatHistory.map((msg) => {
      if (msg.id !== msgId || !msg.suggestedActions) return msg;
      const updatedActions = msg.suggestedActions.map((a) => (a.id === actionId ? { ...a, status: newStatus } : a));
      return { ...msg, suggestedActions: updatedActions };
    });
    updateChatHistory(updated);
  };

  const handleApproveAllActions = (msgId: string) => {
    const updated = chatHistory.map((msg) => {
      if (msg.id !== msgId || !msg.suggestedActions) return msg;
      return { ...msg, suggestedActions: msg.suggestedActions.map((a) => ({ ...a, status: 'accepted' as const })) };
    });
    updateChatHistory(updated);
  };

  const handleApplyAcceptedActions = (msgId: string) => {
    const msg = chatHistory.find((m) => m.id === msgId);
    if (!msg || !msg.suggestedActions) return;

    const accepted = msg.suggestedActions.filter((a) => a.status === 'accepted');
    if (accepted.length === 0) return;

    let currentQs = [...questions];

    // Process each accepted action in order
    accepted.forEach((action) => {
      if (action.actionType === 'create') {
        const newQ: QuestionItem = {
          id: `q_inserted_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          type: action.type || 'multiple_choice',
          question: action.question || '',
          options: action.options && action.options.length >= 2 ? action.options : ['', '', '', ''],
          correctIndex: typeof action.correctIndex === 'number' ? action.correctIndex : 0,
          selectedIndex: null,
          expectedAnswer: action.expectedAnswer || '',
          userTypedAnswer: '',
          aiFeedback: null,
          explanation: action.explanation || '',
          showExplanation: false,
          answered: false,
        };
        // If the battery has only a single blank placeholder, replace it
        if (currentQs.length === 1 && !currentQs[0].question.trim() && !currentQs[0].answered) {
          currentQs = [newQ];
        } else {
          currentQs = [...currentQs, newQ];
        }
      } else if (action.actionType === 'edit' && action.targetQuestionIndex) {
        const idx = action.targetQuestionIndex - 1; // 1-based → 0-based
        if (idx >= 0 && idx < currentQs.length && action.changes) {
          currentQs = currentQs.map((q, i) => i === idx ? { ...q, ...action.changes } : q);
        }
      } else if (action.actionType === 'delete' && action.targetQuestionIndex) {
        const idx = action.targetQuestionIndex - 1;
        if (idx >= 0 && idx < currentQs.length) {
          const filtered = currentQs.filter((_, i) => i !== idx);
          currentQs = filtered.length > 0 ? filtered : [createDefaultQuestion(1)];
        }
      }
    });

    updateQuestions(currentQs);
    setShowAiAssistantModal(false);
  };

  const handleClearChatHistory = () => {
    updateChatHistory([]);
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

  // Cálculo de Estatísticas
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
          {/* Seta para Esconder/Expandir */}
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

        {/* Placar Badge & Controles Globais */}
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

          {/* Refazer Tudo */}
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

          {/* Botão Ícone Minimalista ✨ Assistente IA */}
          <button
            onClick={() => setShowAiAssistantModal(true)}
            className="p-1.5 bg-gradient-to-r from-purple-500/20 to-brand-500/20 hover:from-purple-500/30 hover:to-brand-500/30 text-purple-300 rounded-md border border-purple-500/30 font-bold text-sm transition-all flex items-center justify-center"
            title="Assistente de Questões IA (Chat, Criação & Análise)"
          >
            ✨
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

              {/* MÚLTIPLA ESCOLHA */}
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

              {/* QUESTÃO ABERTA */}
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

              {/* Explicação da Solução */}
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

              {/* Ações da Sub-Questão */}
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

          {/* Adicionar Questão */}
          <button
            onClick={handleAddQuestion}
            className="w-full py-2.5 border-2 border-dashed border-white/10 hover:border-brand-500/40 text-brand-300 hover:text-white rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 transition-all bg-black/20 hover:bg-black/30"
          >
            <Plus size={16} />
            <span>Adicionar Nova Questão à Bateria</span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* CLEAN FLOATING MODAL OVERLAY: MINI ASSISTENTE IA CHAT   */}
      {/* ======================================================== */}
      {showAiAssistantModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn"
          onClick={() => setShowAiAssistantModal(false)}
        >
          <div
            className="bg-dark-card border border-white/15 rounded-2xl max-w-2xl w-full max-h-[85vh] h-[650px] flex flex-col shadow-2xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-dark-bg/60">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-purple-500/20 text-purple-300 rounded-lg border border-purple-500/30">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-brand-100 flex items-center gap-1.5">
                    Assistente Didático de Questões
                    <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full font-medium border border-purple-500/30">
                      Gemini AI
                    </span>
                  </h3>
                  <p className="text-[11px] text-dark-subtext">Crie, filtre e analise sua bateria de exercícios</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {chatHistory.length > 0 && (
                  <button
                    onClick={handleClearChatHistory}
                    className="p-1.5 text-dark-subtext hover:text-red-400 hover:bg-white/10 rounded-lg text-xs transition-colors flex items-center gap-1"
                    title="Limpar histórico do chat"
                  >
                    <Trash2 size={14} />
                    <span className="text-[11px]">Limpar</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAiAssistantModal(false)}
                  className="p-1.5 text-dark-subtext hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Message Trajectory */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-dark-subtext space-y-3">
                  <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-200">Como posso ajudar na sua bateria de exercícios?</p>
                    <p className="text-xs text-dark-subtext mt-1 max-w-sm">
                      Você pode me pedir para criar questões, fazer um diagnóstico da bateria atual ou refinar os enunciados.
                    </p>
                  </div>
                </div>
              ) : (
                chatHistory.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      <div
                        className={`max-w-[90%] rounded-2xl p-3.5 text-xs shadow-sm ${
                          isUser
                            ? 'bg-brand-600 text-white rounded-tr-xs'
                            : 'bg-dark-bg border border-white/10 text-brand-50 rounded-tl-xs space-y-3'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[11px] opacity-75 font-medium">
                          {isUser ? <User size={12} /> : <Bot size={12} className="text-purple-400" />}
                          <span>{isUser ? 'Você' : 'Assistente IA'}</span>
                        </div>

                        {/* Texto da Mensagem */}
                        <div className="leading-relaxed whitespace-pre-wrap">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>

                        {/* AÇÕES SUGERIDAS PELA IA (create / edit / delete) COM APROVAÇÃO V/X */}
                        {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                            <div className="flex items-center justify-between font-semibold text-xs text-purple-300">
                              <span className="flex items-center gap-1.5">
                                <Sparkles size={13} />
                                {msg.suggestedActions.length} {msg.suggestedActions.length === 1 ? 'Sugestão' : 'Sugestões'} da IA
                              </span>
                              <button
                                onClick={() => handleApproveAllActions(msg.id)}
                                className="text-[11px] text-green-400 hover:text-green-300 underline font-medium"
                              >
                                ✓ Aprovar Todas
                              </button>
                            </div>

                            <div className="space-y-2">
                              {msg.suggestedActions.map((action, aIdx) => {
                                const isAccepted = action.status === 'accepted';
                                const isRejected = action.status === 'rejected';
                                const actionLabel =
                                  action.actionType === 'create' ? '✨ Criar'
                                  : action.actionType === 'edit' ? `✏️ Editar Questão ${action.targetQuestionIndex || '?'}`
                                  : `🗑️ Remover Questão ${action.targetQuestionIndex || '?'}`;
                                const badgeClass =
                                  action.actionType === 'create' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                  : action.actionType === 'edit' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : 'bg-red-500/20 text-red-300 border-red-500/30';
                                const cardClass =
                                  action.actionType === 'create' ? 'bg-purple-500/5 border-purple-500/25'
                                  : action.actionType === 'edit' ? 'bg-blue-500/5 border-blue-500/25'
                                  : 'bg-red-500/5 border-red-500/25';
                                return (
                                  <div
                                    key={action.id}
                                    className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                                      isAccepted ? 'bg-green-500/10 border-green-500/40'
                                      : isRejected ? `opacity-40 line-through ${cardClass}`
                                      : cardClass
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                                        {actionLabel}
                                        {action.actionType === 'create' && action.type && (
                                          <span className="ml-1 opacity-70">({action.type === 'open' ? 'Aberta' : 'Múltipla Escolha'})</span>
                                        )}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleActionStatusChange(msg.id, action.id, isAccepted ? 'pending' : 'accepted')}
                                          className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-colors ${isAccepted ? 'bg-green-500 text-black' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                                          title="Aceitar"
                                        >
                                          <Check size={12} /><span>V</span>
                                        </button>
                                        <button
                                          onClick={() => handleActionStatusChange(msg.id, action.id, isRejected ? 'pending' : 'rejected')}
                                          className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 transition-colors ${isRejected ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
                                          title="Rejeitar"
                                        >
                                          <X size={12} /><span>X</span>
                                        </button>
                                      </div>
                                    </div>

                                    {action.actionType === 'create' && (
                                      <div className="space-y-1.5">
                                        <p className="font-semibold text-brand-100 leading-snug">{action.question}</p>
                                        {action.type === 'multiple_choice' && action.options && (
                                          <ul className="space-y-0.5 text-[11px] text-dark-subtext">
                                            {action.options.map((opt: string, oIdx: number) => (
                                              <li key={oIdx} className={oIdx === action.correctIndex ? 'text-green-400 font-bold' : ''}>
                                                {String.fromCharCode(65 + oIdx)}) {opt}
                                              </li>
                                            ))}
                                          </ul>
                                        )}
                                        {action.type === 'open' && action.expectedAnswer && (
                                          <p className="text-[11px] text-brand-300 font-medium">📌 Gabarito: {action.expectedAnswer}</p>
                                        )}
                                      </div>
                                    )}

                                    {action.actionType === 'edit' && (
                                      <div className="space-y-1 text-[11px]">
                                        {action.changes?.question && (
                                          <>
                                            <p className="text-dark-subtext line-through opacity-60">Antes: {questions[(action.targetQuestionIndex || 1) - 1]?.question || '—'}</p>
                                            <p className="text-blue-300 font-semibold">Depois: {action.changes.question}</p>
                                          </>
                                        )}
                                        {action.changes?.explanation && (
                                          <p className="text-blue-200 opacity-90">💡 Nova explicação: {action.changes.explanation}</p>
                                        )}
                                        {!action.changes?.question && !action.changes?.explanation && (
                                          <p className="text-blue-200 opacity-80">Atualização de alternativas e/ou gabarito</p>
                                        )}
                                      </div>
                                    )}

                                    {action.actionType === 'delete' && (
                                      <div className="space-y-1 text-[11px]">
                                        <p className="font-semibold text-red-300 leading-snug">"{questions[(action.targetQuestionIndex || 1) - 1]?.question || 'Questão não encontrada'}"</p>
                                        {action.reason && <p className="text-red-400/80 italic">Motivo: {action.reason}</p>}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {msg.suggestedActions.some((a) => a.status === 'accepted') && (
                              <button
                                onClick={() => handleApplyAcceptedActions(msg.id)}
                                className="w-full py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md"
                              >
                                <CheckCheck size={16} />
                                <span>
                                  Aplicar {msg.suggestedActions.filter((a) => a.status === 'accepted').length} {msg.suggestedActions.filter((a) => a.status === 'accepted').length === 1 ? 'Ação Aceita' : 'Ações Aceitas'} na Bateria
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {isSendingChat && (
                <div className="flex items-center gap-2 text-xs text-purple-300 bg-purple-950/30 border border-purple-500/20 rounded-xl p-3 max-w-[200px]">
                  <Loader2 size={14} className="animate-spin text-purple-400" />
                  <span>Assistente pensando...</span>
                </div>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 bg-dark-bg/80 border-t border-white/5 flex gap-1.5 overflow-x-auto custom-scrollbar text-[11px]">
              <button
                onClick={() => handleSendChatMessage('Analise a bateria de questões atual e diga o que acha.')}
                disabled={isSendingChat}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-brand-200 rounded-full border border-white/10 shrink-0 transition-colors"
              >
                📊 Analise a Bateria Atual
              </button>
              <button
                onClick={() => handleSendChatMessage('Crie 3 questões de múltipla escolha sobre o conteúdo.')}
                disabled={isSendingChat}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-brand-200 rounded-full border border-white/10 shrink-0 transition-colors"
              >
                ✨ Crie 3 Questões
              </button>
              <button
                onClick={() => handleSendChatMessage('Identifique lacunas e sugira 2 questões abertas discursivas.')}
                disabled={isSendingChat}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-brand-200 rounded-full border border-white/10 shrink-0 transition-colors"
              >
                🎯 Sugerir Exercícios
              </button>
            </div>

            {/* Input Bar Footer */}
            <div className="p-3 bg-dark-bg border-t border-white/10 flex gap-2 items-center">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Pergunte à IA ou peça para gerar/analisar questões..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-brand-100 placeholder-white/30 outline-none focus:border-purple-500 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                disabled={isSendingChat}
              />
              <button
                onClick={() => handleSendChatMessage()}
                disabled={!chatInput.trim() || isSendingChat}
                className="p-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl transition-colors flex items-center justify-center shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
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
      aiChatHistory: { default: [] },
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

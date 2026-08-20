import React, { useState, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { ChevronUp } from 'lucide-react';
import { promptGeminiQuizAssistant } from '../../../services/gemini';
import QuizBatteryHeader from './components/QuizBatteryHeader';
import QuizTagsFilter from './components/QuizTagsFilter';
import QuizEditor from './components/QuizEditor';
import QuizPlayer from './components/QuizPlayer';
import QuizAIAssistant from './components/QuizAIAssistant';
import QuizImportModal from './components/QuizImportModal';
import { QuizDeleteModals } from './components/QuizDeleteModals';
import { useQuizState } from './hooks/useQuizState';
import { useQuizEvaluation } from './hooks/useQuizEvaluation';
import { normalizeChatHistory } from './utils/quizNormalizer';
import { triggerToast } from '../../ui/ToastContext';
import type { QuestionItem, QuizChatMessage, SuggestedAction } from './types';

export default function QuestionBlockNodeView(props: any) {
  const {
    title,
    description,
    isCollapsed,
    mode: rawMode,
    questions: rawQuestions,
    aiChatHistory: rawChatHistory,
  } = props.node.attrs;

  const mode: 'edit' | 'practice' = rawMode === 'practice' ? 'practice' : 'edit';
  const chatHistory: QuizChatMessage[] = normalizeChatHistory(rawChatHistory);

  const {
    questions,
    displayedQuestions,
    selectedTagFilter,
    setSelectedTagFilter,
    allBatteryTags,
    copiedJson,
    updateQuestions,
    updateSingleQuestion,
    handleToggleQuestionType,
    handleAddQuestion,
    handleMoveQuestion,
    handleRemoveQuestion,
    handleCopyQuestionsJson,
  } = useQuizState(rawQuestions, title, props.updateAttributes);

  const { evaluatingIds, handleEvaluateOpenAnswer } = useQuizEvaluation(updateSingleQuestion);

  // AI Assistant chat states
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Import and deletion modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [deletingQuestionInfo, setDeletingQuestionInfo] = useState<{
    id: string;
    index: number;
  } | null>(null);
  const [showDeleteContainerModal, setShowDeleteContainerModal] = useState(false);

  const updateChatHistory = (newHistory: QuizChatMessage[]) => {
    props.updateAttributes({ aiChatHistory: newHistory });
  };

  const handleSetMode = (newMode: 'edit' | 'practice', e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    props.updateAttributes({ mode: newMode });
  };

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
    setChatInput('');
    setIsSendingChat(true);

    try {
      const response = await promptGeminiQuizAssistant(
        updatedHistoryWithUser.map((m) => ({ role: m.role, text: m.text })),
        questions,
        messageToSend,
        undefined,
        title,
        description
      );

      const assistantMsgId = `assistant_${Date.now()}`;
      const actions: SuggestedAction[] | undefined = response.suggestedActions?.map(
        (a: any, idx: number) => {
          const changes = a.changes || {};
          if (a.actionType === 'edit') {
            if (a.question && !changes.question) changes.question = a.question;
            if (a.options && !changes.options) changes.options = a.options;
            if (typeof a.correctIndex === 'number' && changes.correctIndex === undefined)
              changes.correctIndex = a.correctIndex;
            if (a.expectedAnswer && !changes.expectedAnswer)
              changes.expectedAnswer = a.expectedAnswer;
            if (a.explanation && !changes.explanation) changes.explanation = a.explanation;
            if (a.type && !changes.type) changes.type = a.type;
          }

          return {
            id: `action_${Date.now()}_${idx}`,
            actionType: a.actionType,
            status: 'pending' as const,
            type: a.type || 'multiple_choice',
            question: a.question || '',
            options: a.options && a.options.length >= 2 ? a.options : ['', '', '', ''],
            correctIndex: typeof a.correctIndex === 'number' ? a.correctIndex : 0,
            expectedAnswer: a.expectedAnswer || '',
            explanation: a.explanation || '',
            targetQuestionIndex: a.targetQuestionIndex,
            changes,
            reason: a.reason,
          };
        }
      );

      let messageText = response.message || 'Aqui estão as sugestões para a sua bateria:';
      if (messageText.trim().startsWith('{')) {
        const msgMatch = /"message":\s*"([^"]+)"/.exec(messageText);
        messageText = msgMatch
          ? msgMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
          : 'Aqui estão as sugestões para a sua bateria:';
      }

      const assistantMessageObj: QuizChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        text: messageText,
        suggestedActions: actions,
      };

      updateChatHistory([...updatedHistoryWithUser, assistantMessageObj]);
    } catch (err: any) {
      console.error('[QuestionBlock] Falha ao comunicar com assistente de IA:', err);
      const errorMessage =
        err?.message || 'Falha na comunicação com a API de IA. Verifique sua conexão e chave de API.';
      triggerToast(`Erro na IA: ${errorMessage}`, 'error', 4500);

      const assistantErrorMsg: QuizChatMessage = {
        id: `assistant_err_${Date.now()}`,
        role: 'assistant',
        text: `⚠️ **Erro de Comunicação com a IA**\n\nNão foi possível processar sua solicitação no momento.\n\n*Detalhes:* ${errorMessage}\n\nPor favor, verifique suas configurações de API ou conexão e tente novamente.`,
      };
      updateChatHistory([...updatedHistoryWithUser, assistantErrorMsg]);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleAcceptAction = (action: SuggestedAction) => {
    if (action.actionType === 'create') {
      const newQ: QuestionItem = {
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: action.type === 'open' ? 'open' : 'multiple_choice',
        question: action.question || '',
        options: action.options || ['', '', '', ''],
        correctIndex: action.correctIndex ?? 0,
        tags: action.tags || [],
        selectedIndex: null,
        expectedAnswer: action.expectedAnswer || '',
        userTypedAnswer: '',
        aiFeedback: null,
        explanation: action.explanation || '',
        showExplanation: false,
        answered: false,
      };
      updateQuestions([...questions, newQ]);
    } else if (action.actionType === 'edit' && typeof action.targetQuestionIndex === 'number') {
      const targetQ = questions[action.targetQuestionIndex];
      if (targetQ && action.changes) {
        updateSingleQuestion(targetQ.id, action.changes);
      }
    } else if (action.actionType === 'delete' && typeof action.targetQuestionIndex === 'number') {
      const targetQ = questions[action.targetQuestionIndex];
      if (targetQ) {
        handleRemoveQuestion(targetQ.id);
      }
    }

    const updatedChat = chatHistory.map((m) => {
      if (!m.suggestedActions) return m;
      return {
        ...m,
        suggestedActions: m.suggestedActions.map((act) =>
          act.id === action.id ? { ...act, status: 'accepted' as const } : act
        ),
      };
    });
    updateChatHistory(updatedChat);
  };

  const handleRejectAction = (action: SuggestedAction) => {
    const updatedChat = chatHistory.map((m) => {
      if (!m.suggestedActions) return m;
      return {
        ...m,
        suggestedActions: m.suggestedActions.map((act) =>
          act.id === action.id ? { ...act, status: 'rejected' as const } : act
        ),
      };
    });
    updateChatHistory(updatedChat);
  };

  const handleAcceptAllInMessage = (msgId: string) => {
    const targetMsg = chatHistory.find((m) => m.id === msgId);
    if (!targetMsg || !targetMsg.suggestedActions) return;

    const pendingActions = targetMsg.suggestedActions.filter((a) => a.status === 'pending');
    if (pendingActions.length === 0) return;

    let currentQuestionsList = [...questions];

    pendingActions.forEach((action, idx) => {
      if (action.actionType === 'create') {
        const newQ: QuestionItem = {
          id: `q_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
          type: action.type === 'open' ? 'open' : 'multiple_choice',
          question: action.question || '',
          options: action.options || ['', '', '', ''],
          correctIndex: action.correctIndex ?? 0,
          tags: action.tags || [],
          selectedIndex: null,
          expectedAnswer: action.expectedAnswer || '',
          userTypedAnswer: '',
          aiFeedback: null,
          explanation: action.explanation || '',
          showExplanation: false,
          answered: false,
        };
        currentQuestionsList.push(newQ);
      } else if (action.actionType === 'edit' && typeof action.targetQuestionIndex === 'number') {
        const targetQ = currentQuestionsList[action.targetQuestionIndex];
        if (targetQ && action.changes) {
          currentQuestionsList[action.targetQuestionIndex] = {
            ...targetQ,
            ...action.changes,
          };
        }
      } else if (action.actionType === 'delete' && typeof action.targetQuestionIndex === 'number') {
        const targetQ = currentQuestionsList[action.targetQuestionIndex];
        if (targetQ) {
          currentQuestionsList = currentQuestionsList.filter((q) => q.id !== targetQ.id);
        }
      }
    });

    updateQuestions(currentQuestionsList);

    const updatedChat = chatHistory.map((m) => {
      if (m.id !== msgId || !m.suggestedActions) return m;
      return {
        ...m,
        suggestedActions: m.suggestedActions.map((act) =>
          act.status === 'pending' ? { ...act, status: 'accepted' as const } : act
        ),
      };
    });
    updateChatHistory(updatedChat);
  };

  const handleRejectAllInMessage = (msgId: string) => {
    const updatedChat = chatHistory.map((m) => {
      if (m.id !== msgId || !m.suggestedActions) return m;
      return {
        ...m,
        suggestedActions: m.suggestedActions.map((act) =>
          act.status === 'pending' ? { ...act, status: 'rejected' as const } : act
        ),
      };
    });
    updateChatHistory(updatedChat);
  };

  const blockContainerRef = useRef<HTMLDivElement>(null);

  return (
    <NodeViewWrapper className="question-block my-6 w-full block" contentEditable={false}>
      <div
        ref={blockContainerRef}
        className="rounded-3xl border border-purple-500/30 bg-[#100d1c] shadow-2xl overflow-hidden"
      >
        {/* Header Principal */}
        <div className="p-6 border-b border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-dark-card to-purple-950/20">
          <QuizBatteryHeader
            title={title}
            description={description}
            mode={mode}
            isCollapsed={isCollapsed}
            copiedJson={copiedJson}
            onUpdateTitle={(val) => props.updateAttributes({ title: val })}
            onUpdateDescription={(val) => props.updateAttributes({ description: val })}
            onSetMode={handleSetMode}
            onOpenAiAssistant={() => setShowAiAssistantModal(true)}
            onOpenImport={() => setShowImportModal(true)}
            onCopyJson={handleCopyQuestionsJson}
            onOpenDeleteModal={() => setShowDeleteContainerModal(true)}
            onToggleCollapse={() => props.updateAttributes({ isCollapsed: !isCollapsed })}
          />

          {/* Filtro por Tags */}
          {!isCollapsed && (
            <QuizTagsFilter
              tags={allBatteryTags}
              questions={questions}
              selectedTagFilter={selectedTagFilter}
              onSelectTag={setSelectedTagFilter}
            />
          )}
        </div>

        {/* Corpo (Lista de Questões) */}
        {!isCollapsed && (
          <div className="p-6 space-y-6">
            {mode === 'edit' ? (
              <QuizEditor
                questions={displayedQuestions}
                onUpdateQuestion={updateSingleQuestion}
                onToggleQuestionType={handleToggleQuestionType}
                onMoveQuestion={handleMoveQuestion}
                onDeleteQuestion={(id, idx) => setDeletingQuestionInfo({ id, index: idx })}
                onAddQuestion={handleAddQuestion}
              />
            ) : (
              <QuizPlayer
                questions={displayedQuestions}
                onUpdateSingleQuestion={updateSingleQuestion}
                onEvaluateOpenAnswer={handleEvaluateOpenAnswer}
                evaluatingIds={evaluatingIds}
                onDiscussInChat={(q, idx) => {
                  setShowAiAssistantModal(true);
                  const questionHeader = `Gostaria de discutir a avaliação da Questão ${idx + 1}`;
                  const alreadyDiscussed = chatHistory.some(
                    (m) => m.role === 'user' && m.text.includes(questionHeader)
                  );
                  if (alreadyDiscussed) return;

                  const prompt = `${questionHeader} ("${q.question}"):\n- Minha Resposta: "${q.userTypedAnswer}"\n- Avaliação da IA: ${q.aiFeedback?.verdict || 'N/A'}\n- Parecer da IA: "${q.aiFeedback?.feedback || ''}"\n- Gabarito de Referência: "${q.expectedAnswer || 'N/A'}"\n\nPode me explicar didaticamente por que recebi esta avaliação e como posso aperfeiçoar meu entendimento ou resposta?`;
                  handleSendChatMessage(prompt);
                }}
              />
            )}

            {/* Botão Voltar ao Topo da Bateria */}
            {questions.length > 1 && (
              <div className="flex justify-center pt-3 pb-1 border-t border-white/5">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    blockContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="flex items-center gap-1.5 text-xs text-dark-subtext hover:text-purple-300 bg-black/40 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 px-4 py-1.5 rounded-full transition-all duration-200 group shadow-sm"
                  title="Rolar suavemente até o topo desta bateria de questões"
                >
                  <ChevronUp size={14} className="group-hover:-translate-y-0.5 transition-transform text-purple-400" />
                  <span>Voltar ao topo da bateria</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Assistente IA */}
      <QuizAIAssistant
        isOpen={showAiAssistantModal}
        onClose={() => setShowAiAssistantModal(false)}
        chatHistory={chatHistory}
        chatInput={chatInput}
        setChatInput={setChatInput}
        isSendingChat={isSendingChat}
        onSendMessage={handleSendChatMessage}
        onClearHistory={() => updateChatHistory([])}
        onAcceptAction={handleAcceptAction}
        onRejectAction={handleRejectAction}
        onAcceptAllInMessage={handleAcceptAllInMessage}
        onRejectAllInMessage={handleRejectAllInMessage}
        questions={questions}
      />

      {/* Modal Importar JSON */}
      <QuizImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={(imported, importMode) => {
          if (importMode === 'replace') {
            updateQuestions(imported);
          } else {
            const base = questions.length === 1 && !questions[0].question.trim() ? [] : questions;
            updateQuestions([...base, ...imported]);
          }
        }}
      />

      {/* Modais de Exclusão */}
      <QuizDeleteModals
        deletingQuestionInfo={deletingQuestionInfo}
        onCancelDeleteQuestion={() => setDeletingQuestionInfo(null)}
        onConfirmDeleteQuestion={(id) => {
          handleRemoveQuestion(id);
          setDeletingQuestionInfo(null);
        }}
        showDeleteContainerModal={showDeleteContainerModal}
        totalQuestions={questions.length}
        onCancelDeleteContainer={() => setShowDeleteContainerModal(false)}
        onConfirmDeleteContainer={() => {
          setShowDeleteContainerModal(false);
          props.deleteNode();
        }}
      />
    </NodeViewWrapper>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import {
  HelpCircle,
  Play,
  Edit2,
  Sparkles,
  Copy,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  RotateCcw,
  Tag,
  X,
} from 'lucide-react';
import { Portal } from '../../ui/Portal';
import {
  promptGeminiForOpenQuestionEvaluation,
  promptGeminiQuizAssistant,
  sanitizeExpectedAnswer,
} from '../../../services/gemini';
import { triggerFireworksAnimation, createDefaultQuestion } from './utils/fireworks';
import { preprocessMarkdownCode } from './utils/markdownPreprocess';
import QuizBatteryHeader from './components/QuizBatteryHeader';
import QuizTagsFilter from './components/QuizTagsFilter';
import QuizEditor from './components/QuizEditor';
import QuizPlayer from './components/QuizPlayer';
import QuizAIAssistant from './components/QuizAIAssistant';
import QuizImportModal from './components/QuizImportModal';
import type { QuestionItem, QuizChatMessage, SuggestedAction, AttemptItem } from './types';

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
  const initialQuestions: QuestionItem[] =
    Array.isArray(rawQuestions) && rawQuestions.length > 0
      ? rawQuestions
      : [createDefaultQuestion(1)];

  const questions: QuestionItem[] = initialQuestions;
  const chatHistory: QuizChatMessage[] = Array.isArray(rawChatHistory) ? rawChatHistory : [];

  const [evaluatingIds, setEvaluatingIds] = useState<Record<string, boolean>>({});
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const [deletingQuestionInfo, setDeletingQuestionInfo] = useState<{
    id: string;
    index: number;
  } | null>(null);
  const [showDeleteContainerModal, setShowDeleteContainerModal] = useState(false);

  const allBatteryTags = Array.from(
    new Set(questions.flatMap((q) => q.tags || []))
  ).filter(Boolean);

  const displayedQuestions = selectedTagFilter
    ? questions.filter((q) => q.tags?.includes(selectedTagFilter))
    : questions;

  const updateQuestions = useCallback(
    (newQuestions: QuestionItem[]) => {
      props.updateAttributes({ questions: newQuestions });
    },
    [props]
  );

  const updateSingleQuestion = useCallback(
    (qId: string, partial: Partial<QuestionItem>) => {
      const updated = questions.map((q) => (q.id === qId ? { ...q, ...partial } : q));
      updateQuestions(updated);
    },
    [questions, updateQuestions]
  );

  const handleToggleQuestionType = useCallback(
    (q: QuestionItem, newType: 'multiple_choice' | 'open') => {
      if (q.type === newType) return;

      const updates: Partial<QuestionItem> = {
        type: newType,
        answered: false,
        selectedIndex: null,
        userTypedAnswer: '',
        aiFeedback: null,
      };

      if (newType === 'multiple_choice') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          updates.options = ['', '', '', ''];
        }
      } else if (newType === 'open') {
        if (!q.expectedAnswer && Array.isArray(q.options) && q.options[q.correctIndex]) {
          updates.expectedAnswer = q.options[q.correctIndex];
        }
      }

      updateSingleQuestion(q.id, updates);
    },
    [updateSingleQuestion]
  );

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

  const handleAddQuestion = () => {
    const newQ = createDefaultQuestion(questions.length + 1);
    updateQuestions([...questions, newQ]);
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const newQuestions = [...questions];
    const [moved] = newQuestions.splice(index, 1);
    newQuestions.splice(targetIndex, 0, moved);
    updateQuestions(newQuestions);
  };

  const handleRemoveQuestion = (qId: string) => {
    if (questions.length <= 1) {
      updateQuestions([createDefaultQuestion(1)]);
      return;
    }
    updateQuestions(questions.filter((q) => q.id !== qId));
  };

  const handleCopyQuestionsJson = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const exportData = {
      battery_title: title || 'Bateria de Exercícios',
      total_questions: questions.length,
      questions: questions.map((q, idx) => {
        if (q.type === 'multiple_choice') {
          return {
            index: idx + 1,
            type: 'multiple_choice',
            question: q.question,
            options: q.options.map(
              (opt, oIdx) => `${String.fromCharCode(65 + oIdx)}) ${preprocessMarkdownCode(opt)}`
            ),
            correct_option: `${String.fromCharCode(65 + q.correctIndex)}) ${
              q.options[q.correctIndex] || ''
            }`,
            tags: q.tags && q.tags.length > 0 ? q.tags : undefined,
            explanation: q.explanation || undefined,
          };
        } else {
          return {
            index: idx + 1,
            type: 'open',
            question: q.question,
            expected_answer: q.expectedAnswer,
            tags: q.tags && q.tags.length > 0 ? q.tags : undefined,
            explanation: q.explanation || undefined,
          };
        }
      }),
    };

    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleEvaluateOpenAnswer = async (q: QuestionItem) => {
    if (!q.userTypedAnswer.trim() || evaluatingIds[q.id]) return;

    setEvaluatingIds((prev) => ({ ...prev, [q.id]: true }));
    try {
      const evaluation = await promptGeminiForOpenQuestionEvaluation(
        q.question || 'Questão sem enunciado',
        q.expectedAnswer || 'Gabarito não cadastrado',
        q.userTypedAnswer
      );

      const newAttempt: AttemptItem = {
        id: `att_${Date.now()}`,
        timestamp: Date.now(),
        type: 'open',
        userTypedAnswer: q.userTypedAnswer,
        aiFeedback: evaluation,
      };

      updateSingleQuestion(q.id, {
        answered: true,
        aiFeedback: evaluation,
        showExplanation: true,
        attemptsHistory: [newAttempt, ...(q.attemptsHistory || [])],
      });

      if (evaluation?.verdict === 'Correto') {
        triggerFireworksAnimation();
      }
    } catch (err) {
      console.error('[QuestionBlock] Falha ao avaliar resposta aberta:', err);
    } finally {
      setEvaluatingIds((prev) => ({ ...prev, [q.id]: false }));
    }
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
        messageToSend
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
    } catch (err) {
      console.error('[QuestionBlock] Falha ao comunicar com assistente de IA:', err);
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleAcceptAction = (action: SuggestedAction) => {
    if (action.actionType === 'create') {
      const newQ: QuestionItem = {
        id: `q_${Date.now()}`,
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

  return (
    <NodeViewWrapper className="question-block my-6 w-full block" contentEditable={false}>
      <div className="rounded-3xl border border-purple-500/30 bg-dark-bg/95 shadow-2xl overflow-hidden backdrop-blur-xl transition-all">
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
          <div className="p-6">
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
                  const prompt = `Gostaria de discutir a avaliação da Questão ${idx + 1} ("${q.question}"):\n- Minha Resposta: "${q.userTypedAnswer}"\n- Avaliação da IA: ${q.aiFeedback?.verdict || 'N/A'}\n- Parecer: "${q.aiFeedback?.feedback || ''}"\n\nPode me explicar como melhorar?`;
                  handleSendChatMessage(prompt);
                }}
              />
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

      {/* Modal de Exclusão de Questão */}
      {deletingQuestionInfo && (
        <Portal>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setDeletingQuestionInfo(null)}
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
                  onClick={() => setDeletingQuestionInfo(null)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-dark-subtext hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    handleRemoveQuestion(deletingQuestionInfo.id);
                    setDeletingQuestionInfo(null);
                  }}
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
            onClick={() => setShowDeleteContainerModal(false)}
          >
            <div
              className="bg-dark-card border border-red-500/20 rounded-2xl p-6 w-[380px] shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-2">Remover Bateria Inteira</h3>
              <p className="text-dark-subtext text-sm mb-6">
                Deseja realmente excluir todo este bloco de exercícios e suas {questions.length}{' '}
                questões?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteContainerModal(false)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-dark-subtext hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowDeleteContainerModal(false);
                    props.deleteNode();
                  }}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Excluir Bloco
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </NodeViewWrapper>
  );
}

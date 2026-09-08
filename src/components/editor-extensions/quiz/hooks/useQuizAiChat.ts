import { useState, useCallback, useRef } from 'react';
import { promptGeminiQuizAssistant } from '../../../../services/gemini';
import { normalizeCandidateAction } from '../../../../services/gemini/quiz-parser';
import { triggerToast } from '../../../ui/ToastContext';
import type { QuestionItem, QuizChatMessage, SuggestedAction, ReferencedBattery } from '../types';

interface UseQuizAiChatOptions {
  chatHistory: QuizChatMessage[];
  updateChatHistory: (history: QuizChatMessage[]) => void;
  questions: QuestionItem[];
  updateQuestions: (questions: QuestionItem[]) => void;
  updateSingleQuestion: (qId: string, partial: Partial<QuestionItem>, immediate?: boolean) => void;
  handleRemoveQuestion: (id: string) => void;
  title?: string;
  description?: string;
}

export interface ChatProgressStatus {
  step: 'generating' | 'validating';
  model?: string;
}

export function useQuizAiChat({
  chatHistory,
  updateChatHistory,
  questions,
  updateQuestions,
  updateSingleQuestion,
  handleRemoveQuestion,
  title,
  description,
}: UseQuizAiChatOptions) {
  const [showAiAssistantModal, setShowAiAssistantModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatProgressStatus, setChatProgressStatus] = useState<ChatProgressStatus | null>(null);

  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  const chatHistoryRef = useRef(chatHistory);
  chatHistoryRef.current = chatHistory;

  const handleSendChatMessage = useCallback(
    async (
      overrideMessage?: string,
      referencedBatteries?: ReferencedBattery[]
    ) => {
      const messageToSend = (overrideMessage || chatInput).trim();
      if (!messageToSend || isSendingChat) return;

      const userMsgId = `user_${Date.now()}`;
      const userMessageObj: QuizChatMessage = {
        id: userMsgId,
        role: 'user',
        text: messageToSend,
      };

      const updatedHistoryWithUser = [...chatHistoryRef.current, userMessageObj];
      updateChatHistory(updatedHistoryWithUser);
      setChatInput('');
      setIsSendingChat(true);
      setChatProgressStatus({ step: 'generating' });

      try {
        const response = await promptGeminiQuizAssistant(
          updatedHistoryWithUser.map((m) => ({ role: m.role, text: m.text })),
          questionsRef.current,
          messageToSend,
          undefined,
          title,
          description,
          referencedBatteries,
          (step, model) => {
            setChatProgressStatus({ step, model });
          }
        );

        const assistantMsgId = `assistant_${Date.now()}`;
        const actions: SuggestedAction[] | undefined = response.suggestedActions?.map(
          (rawAction: unknown, idx: number) => {
            const norm = normalizeCandidateAction(rawAction, questionsRef.current.length);
            return {
              id: `action_${Date.now()}_${idx}`,
              actionType: norm.actionType,
              status: 'pending' as const,
              type: norm.type || 'multiple_choice',
              question: norm.question || '',
              options: norm.options && norm.options.length >= 2 ? norm.options : ['', '', '', ''],
              correctIndex: typeof norm.correctIndex === 'number' ? norm.correctIndex : 0,
              expectedAnswer: norm.expectedAnswer || '',
              explanation: norm.explanation || '',
              targetQuestionIndex: norm.targetQuestionIndex,
              order: norm.order,
              changes: norm.changes,
              reason: norm.reason,
              factCheckVerdict: norm.factCheckVerdict,
              validatedByModel: norm.validatedByModel,
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
          validationSummary: response.validationSummary,
        };

        updateChatHistory([...updatedHistoryWithUser, assistantMessageObj]);
      } catch (err: unknown) {
        console.error('[QuestionBlock] Falha ao comunicar com assistente de IA:', err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Falha na comunicação com a API de IA. Verifique sua conexão e chave de API.';
        triggerToast(`Erro na IA: ${errorMessage}`, 'error', 4500);

        const assistantErrorMsg: QuizChatMessage = {
          id: `assistant_err_${Date.now()}`,
          role: 'assistant',
          text: `⚠️ **Erro de Comunicação com a IA**\n\nNão foi possível processar sua solicitação no momento.\n\n*Detalhes:* ${errorMessage}\n\nPor favor, verifique suas configurações de API ou conexão e tente novamente.`,
        };
        updateChatHistory([...updatedHistoryWithUser, assistantErrorMsg]);
      } finally {
        setIsSendingChat(false);
        setChatProgressStatus(null);
      }
    },
    [chatInput, isSendingChat, updateChatHistory, title, description]
  );

  const handleAcceptAction = useCallback(
    (action: SuggestedAction) => {
      const currentList = [...questionsRef.current];

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
        updateQuestions([...currentList, newQ]);
      } else if (action.actionType === 'edit' && typeof action.targetQuestionIndex === 'number') {
        const targetQ = currentList[action.targetQuestionIndex];
        if (targetQ && action.changes) {
          updateSingleQuestion(targetQ.id, action.changes);
        }
      } else if (action.actionType === 'delete' && typeof action.targetQuestionIndex === 'number') {
        const targetQ = currentList[action.targetQuestionIndex];
        if (targetQ) {
          handleRemoveQuestion(targetQ.id);
        }
      } else if (action.actionType === 'reorder' && Array.isArray(action.order) && action.order.length > 0) {
        const reorderedList: QuestionItem[] = [];
        const addedIds = new Set<string>();

        // Add questions following the suggested sequence
        for (const idx of action.order) {
          const q = currentList[idx];
          if (q && !addedIds.has(q.id)) {
            reorderedList.push(q);
            addedIds.add(q.id);
          }
        }

        // Append any questions omitted in action.order
        for (const q of currentList) {
          if (!addedIds.has(q.id)) {
            reorderedList.push(q);
          }
        }

        if (reorderedList.length > 0) {
          updateQuestions(reorderedList);
        }
      }

      const updatedChat = chatHistoryRef.current.map((m) => {
        if (!m.suggestedActions) return m;
        return {
          ...m,
          suggestedActions: m.suggestedActions.map((act) =>
            act.id === action.id ? { ...act, status: 'accepted' as const } : act
          ),
        };
      });
      updateChatHistory(updatedChat);
    },
    [updateQuestions, updateSingleQuestion, handleRemoveQuestion, updateChatHistory]
  );

  const handleRejectAction = useCallback(
    (action: SuggestedAction) => {
      const updatedChat = chatHistoryRef.current.map((m) => {
        if (!m.suggestedActions) return m;
        return {
          ...m,
          suggestedActions: m.suggestedActions.map((act) =>
            act.id === action.id ? { ...act, status: 'rejected' as const } : act
          ),
        };
      });
      updateChatHistory(updatedChat);
    },
    [updateChatHistory]
  );

  const handleAcceptAllInMessage = useCallback(
    (msgId: string) => {
      const targetMsg = chatHistoryRef.current.find((m) => m.id === msgId);
      if (!targetMsg || !targetMsg.suggestedActions) return;

      const pendingActions = targetMsg.suggestedActions.filter((a) => a.status === 'pending');
      if (pendingActions.length === 0) return;

      const initialQuestions = [...questionsRef.current];
      const deletedIds = new Set<string>();
      const editsById = new Map<string, Record<string, unknown>>();
      const newQuestionsToAdd: QuestionItem[] = [];
      let pendingReorder: number[] | undefined;

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
          newQuestionsToAdd.push(newQ);
        } else if (action.actionType === 'edit' && typeof action.targetQuestionIndex === 'number') {
          const targetQ = initialQuestions[action.targetQuestionIndex];
          if (targetQ && action.changes) {
            const existingChanges = editsById.get(targetQ.id) || {};
            editsById.set(targetQ.id, { ...existingChanges, ...action.changes });
          }
        } else if (action.actionType === 'delete' && typeof action.targetQuestionIndex === 'number') {
          const targetQ = initialQuestions[action.targetQuestionIndex];
          if (targetQ) {
            deletedIds.add(targetQ.id);
          }
        } else if (action.actionType === 'reorder' && Array.isArray(action.order) && action.order.length > 0) {
          pendingReorder = action.order;
        }
      });

      const resultingList: QuestionItem[] = [];
      for (const q of initialQuestions) {
        if (deletedIds.has(q.id)) {
          continue;
        }
        const editChanges = editsById.get(q.id);
        if (editChanges) {
          resultingList.push({
            ...q,
            ...editChanges,
          });
        } else {
          resultingList.push(q);
        }
      }

      resultingList.push(...newQuestionsToAdd);

      if (pendingReorder && pendingReorder.length > 0) {
        const reorderedList: QuestionItem[] = [];
        const addedIds = new Set<string>();

        for (const idx of pendingReorder) {
          const q = resultingList[idx];
          if (q && !addedIds.has(q.id)) {
            reorderedList.push(q);
            addedIds.add(q.id);
          }
        }

        for (const q of resultingList) {
          if (!addedIds.has(q.id)) {
            reorderedList.push(q);
          }
        }

        updateQuestions(reorderedList);
      } else {
        updateQuestions(resultingList);
      }

      const updatedChat = chatHistoryRef.current.map((m) => {
        if (m.id !== msgId || !m.suggestedActions) return m;
        return {
          ...m,
          suggestedActions: m.suggestedActions.map((act) =>
            act.status === 'pending' ? { ...act, status: 'accepted' as const } : act
          ),
        };
      });
      updateChatHistory(updatedChat);
    },
    [updateQuestions, updateChatHistory]
  );

  const handleRejectAllInMessage = useCallback(
    (msgId: string) => {
      const updatedChat = chatHistoryRef.current.map((m) => {
        if (m.id !== msgId || !m.suggestedActions) return m;
        return {
          ...m,
          suggestedActions: m.suggestedActions.map((act) =>
            act.status === 'pending' ? { ...act, status: 'rejected' as const } : act
          ),
        };
      });
      updateChatHistory(updatedChat);
    },
    [updateChatHistory]
  );

  const handleClearChatHistory = useCallback(() => {
    updateChatHistory([]);
  }, [updateChatHistory]);

  const handleDiscussInChat = useCallback(
    (q: QuestionItem, index: number) => {
      setShowAiAssistantModal(true);
      const questionHeader = `Gostaria de discutir a avaliação da Questão ${index + 1}`;
      const alreadyDiscussed = chatHistory.some(
        (m) => m.role === 'user' && m.text.includes(questionHeader)
      );
      if (alreadyDiscussed) return;

      const prompt = `${questionHeader} ("${q.question}"):\n- Minha Resposta: "${q.userTypedAnswer}"\n- Avaliação da IA: ${q.aiFeedback?.verdict || 'N/A'}\n- Parecer da IA: "${q.aiFeedback?.feedback || ''}"\n- Gabarito de Referência: "${q.expectedAnswer || 'N/A'}"\n\nPode me explicar didaticamente por que recebi esta avaliação e como posso aperfeiçoar meu entendimento ou resposta?`;
      handleSendChatMessage(prompt);
    },
    [chatHistory, handleSendChatMessage]
  );

  return {
    showAiAssistantModal,
    setShowAiAssistantModal,
    chatInput,
    setChatInput,
    isSendingChat,
    chatProgressStatus,
    handleSendChatMessage,
    handleAcceptAction,
    handleRejectAction,
    handleAcceptAllInMessage,
    handleRejectAllInMessage,
    handleClearChatHistory,
    handleDiscussInChat,
  };
}

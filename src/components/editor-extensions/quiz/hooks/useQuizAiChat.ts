import { useState } from 'react';
import { promptGeminiQuizAssistant } from '../../../../services/gemini';
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

  const handleSendChatMessage = async (
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
        description,
        referencedBatteries
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

  const handleClearChatHistory = () => {
    updateChatHistory([]);
  };

  const handleDiscussInChat = (q: QuestionItem, index: number) => {
    setShowAiAssistantModal(true);
    const questionHeader = `Gostaria de discutir a avaliação da Questão ${index + 1}`;
    const alreadyDiscussed = chatHistory.some(
      (m) => m.role === 'user' && m.text.includes(questionHeader)
    );
    if (alreadyDiscussed) return;

    const prompt = `${questionHeader} ("${q.question}"):\n- Minha Resposta: "${q.userTypedAnswer}"\n- Avaliação da IA: ${q.aiFeedback?.verdict || 'N/A'}\n- Parecer da IA: "${q.aiFeedback?.feedback || ''}"\n- Gabarito de Referência: "${q.expectedAnswer || 'N/A'}"\n\nPode me explicar didaticamente por que recebi esta avaliação e como posso aperfeiçoar meu entendimento ou resposta?`;
    handleSendChatMessage(prompt);
  };

  return {
    showAiAssistantModal,
    setShowAiAssistantModal,
    chatInput,
    setChatInput,
    isSendingChat,
    handleSendChatMessage,
    handleAcceptAction,
    handleRejectAction,
    handleAcceptAllInMessage,
    handleRejectAllInMessage,
    handleClearChatHistory,
    handleDiscussInChat,
  };
}

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuizAiChat } from './useQuizAiChat';
import type { QuestionItem, QuizChatMessage, SuggestedAction } from '../types';

describe('useQuizAiChat Unit Tests', () => {
  const mockQuestions: QuestionItem[] = [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'Questão 1 Original',
      options: ['A', 'B', 'C', 'D'],
      correctIndex: 0,
      tags: [],
      selectedIndex: null,
      expectedAnswer: '',
      userTypedAnswer: '',
      aiFeedback: null,
      explanation: 'Exp 1',
      showExplanation: false,
      answered: false,
    },
    {
      id: 'q2',
      type: 'open',
      question: 'Questão 2 Original',
      options: [],
      correctIndex: 0,
      tags: [],
      selectedIndex: null,
      expectedAnswer: 'Resp 2',
      userTypedAnswer: '',
      aiFeedback: null,
      explanation: 'Exp 2',
      showExplanation: false,
      answered: false,
    },
  ];

  it('accepts a create action and appends question to the list', () => {
    let currentQuestions = [...mockQuestions];
    const updateQuestions = vi.fn((q) => {
      currentQuestions = q;
    });
    const updateChatHistory = vi.fn();

    const initialChat: QuizChatMessage[] = [
      {
        id: 'msg_1',
        role: 'assistant',
        text: 'Sugestões',
        suggestedActions: [
          {
            id: 'act_1',
            actionType: 'create',
            status: 'pending',
            type: 'multiple_choice',
            question: 'Nova Questão Criada',
            options: ['Opt 1', 'Opt 2'],
            correctIndex: 1,
            expectedAnswer: '',
            explanation: 'Explicação didática',
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useQuizAiChat({
        chatHistory: initialChat,
        updateChatHistory,
        questions: currentQuestions,
        updateQuestions,
        updateSingleQuestion: vi.fn(),
        handleRemoveQuestion: vi.fn(),
      })
    );

    act(() => {
      result.current.handleAcceptAction(initialChat[0].suggestedActions![0]);
    });

    expect(updateQuestions).toHaveBeenCalledTimes(1);
    const updated = updateQuestions.mock.calls[0][0] as QuestionItem[];
    expect(updated).toHaveLength(3);
    expect(updated[2].question).toBe('Nova Questão Criada');
    expect(updateChatHistory).toHaveBeenCalled();
  });

  it('safely handles batch acceptance with deletions and edits without index corruption', () => {
    let currentQuestions = [...mockQuestions];
    const updateQuestions = vi.fn((q) => {
      currentQuestions = q;
    });
    const updateChatHistory = vi.fn();

    const pendingActions: SuggestedAction[] = [
      {
        id: 'act_del',
        actionType: 'delete',
        status: 'pending',
        targetQuestionIndex: 0, // Target q1
      },
      {
        id: 'act_edit',
        actionType: 'edit',
        status: 'pending',
        targetQuestionIndex: 1, // Target q2
        changes: {
          question: 'Questão 2 Editada no Batch',
        },
      },
      {
        id: 'act_create',
        actionType: 'create',
        status: 'pending',
        type: 'open',
        question: 'Questão 3 Adicionada no Batch',
        expectedAnswer: 'Gabarito 3',
        explanation: 'Exp 3',
      },
    ];

    const initialChat: QuizChatMessage[] = [
      {
        id: 'msg_batch',
        role: 'assistant',
        text: 'Batch de sugestões',
        suggestedActions: pendingActions,
      },
    ];

    const { result } = renderHook(() =>
      useQuizAiChat({
        chatHistory: initialChat,
        updateChatHistory,
        questions: currentQuestions,
        updateQuestions,
        updateSingleQuestion: vi.fn(),
        handleRemoveQuestion: vi.fn(),
      })
    );

    act(() => {
      result.current.handleAcceptAllInMessage('msg_batch');
    });

    expect(updateQuestions).toHaveBeenCalledTimes(1);
    const resultingQuestions = updateQuestions.mock.calls[0][0] as QuestionItem[];

    // q1 should be deleted, q2 edited, q3 appended
    expect(resultingQuestions).toHaveLength(2);
    expect(resultingQuestions.find((q) => q.id === 'q1')).toBeUndefined();
    const editedQ2 = resultingQuestions.find((q) => q.id === 'q2');
    expect(editedQ2).toBeDefined();
    expect(editedQ2?.question).toBe('Questão 2 Editada no Batch');
    expect(resultingQuestions[1].question).toBe('Questão 3 Adicionada no Batch');
  });

  it('accepts a reorder action and reorganizes questions accordingly', () => {
    let currentQuestions = [...mockQuestions];
    const updateQuestions = vi.fn((q) => {
      currentQuestions = q;
    });
    const updateChatHistory = vi.fn();

    const reorderAction: SuggestedAction = {
      id: 'act_reorder',
      actionType: 'reorder',
      status: 'pending',
      order: [1, 0], // Invert order: q2 first, then q1
      reason: 'Estudo prévio de conceitos abertos antes de múltipla escolha',
    };

    const initialChat: QuizChatMessage[] = [
      {
        id: 'msg_reorder',
        role: 'assistant',
        text: 'Reordenação sugerida',
        suggestedActions: [reorderAction],
      },
    ];

    const { result } = renderHook(() =>
      useQuizAiChat({
        chatHistory: initialChat,
        updateChatHistory,
        questions: currentQuestions,
        updateQuestions,
        updateSingleQuestion: vi.fn(),
        handleRemoveQuestion: vi.fn(),
      })
    );

    act(() => {
      result.current.handleAcceptAction(reorderAction);
    });

    expect(updateQuestions).toHaveBeenCalledTimes(1);
    const updated = updateQuestions.mock.calls[0][0] as QuestionItem[];
    expect(updated).toHaveLength(2);
    expect(updated[0].id).toBe('q2');
    expect(updated[1].id).toBe('q1');
  });
});

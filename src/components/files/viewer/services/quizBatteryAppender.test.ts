import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appendQuestionsToBattery } from './quizBatteryAppender';
import type { ReferencedBattery, QuestionItem } from '../../../editor-extensions/quiz/types';

vi.mock('../../../ui/ToastContext', () => ({
  triggerToast: vi.fn(),
}));

describe('quizBatteryAppender', () => {
  const mockBattery: ReferencedBattery = {
    id: 'bat_test',
    title: 'Bateria Inicial',
    pageId: 'page_456',
    pageTitle: 'Página de Estudo',
    questionCount: 1,
    questions: [
      {
        id: 'q_init',
        type: 'multiple_choice',
        question: 'Questão 1',
        options: ['A', 'B'],
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
  };

  const newQuestion: QuestionItem = {
    id: 'q_new',
    type: 'multiple_choice',
    question: 'Questão Nova',
    options: ['C', 'D'],
    correctIndex: 1,
    selectedIndex: null,
    expectedAnswer: '',
    userTypedAnswer: '',
    aiFeedback: null,
    explanation: 'Explicação',
    showExplanation: false,
    answered: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when parameters are invalid', async () => {
    const res = await appendQuestionsToBattery(mockBattery, []);
    expect(res).toBe(false);
  });

  it('dispatches window event and updates in-memory battery questions', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    const res = await appendQuestionsToBattery(mockBattery, [newQuestion]);
    expect(res).toBe(true);

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'caderno-append-quiz-questions',
      })
    );

    expect(mockBattery.questions).toHaveLength(2);
    expect(mockBattery.questionCount).toBe(2);

    dispatchSpy.mockRestore();
  });

  it('updates page in database when window.api is available', async () => {
    const jsonPageContent = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'questionBlock',
          attrs: {
            title: 'Bateria Inicial',
            questions: [mockBattery.questions[0]],
          },
        },
      ],
    });

    (window as any).api = {
      getPageContent: vi.fn().mockResolvedValue({ content: jsonPageContent }),
      updatePage: vi.fn().mockResolvedValue(1),
    };

    const res = await appendQuestionsToBattery(mockBattery, [newQuestion]);
    expect(res).toBe(true);
    expect((window as any).api.updatePage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'page_456',
      })
    );

    delete (window as any).api;
  });
});

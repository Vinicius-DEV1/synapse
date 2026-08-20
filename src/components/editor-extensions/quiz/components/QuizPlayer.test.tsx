import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuizPlayer from './QuizPlayer';
import * as fireworksModule from '../utils/fireworks';
import type { QuestionItem } from '../types';

describe('QuizPlayer Component', () => {
  const sampleQuestions: QuestionItem[] = [
    {
      id: 'q_1',
      type: 'multiple_choice',
      question: 'Quanto é 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctIndex: 1,
      tags: ['matemática'],
      selectedIndex: null,
      expectedAnswer: '',
      userTypedAnswer: '',
      aiFeedback: null,
      explanation: '2 somado a 2 é igual a 4.',
      showExplanation: false,
      answered: false,
      attemptsHistory: [],
    },
  ];

  it('renders question and alternatives without crashing', () => {
    const onUpdateSingleQuestion = vi.fn();
    const onEvaluateOpenAnswer = vi.fn();
    const onDiscussInChat = vi.fn();

    render(
      <QuizPlayer
        questions={sampleQuestions}
        onUpdateSingleQuestion={onUpdateSingleQuestion}
        onEvaluateOpenAnswer={onEvaluateOpenAnswer}
        evaluatingIds={{}}
        onDiscussInChat={onDiscussInChat}
      />
    );

    expect(screen.getByText('Quanto é 2 + 2?')).toBeInTheDocument();
    expect(screen.getByText('Progresso:')).toBeInTheDocument();
    expect(screen.getByText('0/1')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('calls onUpdateSingleQuestion when selecting an option without crashing', () => {
    const onUpdateSingleQuestion = vi.fn();
    const onEvaluateOpenAnswer = vi.fn();
    const onDiscussInChat = vi.fn();

    render(
      <QuizPlayer
        questions={sampleQuestions}
        onUpdateSingleQuestion={onUpdateSingleQuestion}
        onEvaluateOpenAnswer={onEvaluateOpenAnswer}
        evaluatingIds={{}}
        onDiscussInChat={onDiscussInChat}
      />
    );

    // Clica na opção 'B' (índice 1 -> texto '4')
    const optionB = screen.getByText('4').closest('div[role="button"]');
    expect(optionB).not.toBeNull();
    fireEvent.click(optionB!);

    expect(onUpdateSingleQuestion).toHaveBeenCalledWith(
      'q_1',
      expect.objectContaining({
        selectedIndex: 1,
        answered: true,
        showExplanation: true,
      }),
      true
    );
  });

  it('renders answered question with explanation and history safely', () => {
    const answeredQuestion: QuestionItem = {
      ...sampleQuestions[0],
      answered: true,
      selectedIndex: 1,
      showExplanation: true,
      attemptsHistory: [
        {
          id: 'att_1',
          timestamp: Date.now(),
          type: 'multiple_choice',
          selectedIndex: 1,
          isCorrect: true,
        },
      ],
    };

    const onUpdateSingleQuestion = vi.fn();

    render(
      <QuizPlayer
        questions={[answeredQuestion]}
        onUpdateSingleQuestion={onUpdateSingleQuestion}
        onEvaluateOpenAnswer={vi.fn()}
        evaluatingIds={{}}
        onDiscussInChat={vi.fn()}
      />
    );

    expect(screen.getByText('1/1')).toBeInTheDocument();
    expect(screen.getByText('• Acertos:')).toBeInTheDocument();
    expect(screen.getByText(/2 somado a 2 é igual a 4/)).toBeInTheDocument();
    expect(screen.getByText(/Histórico de Tentativas/)).toBeInTheDocument();
  });

  it('handles open question input and evaluation submission correctly', () => {
    const openQuestion: QuestionItem = {
      id: 'q_open',
      type: 'open',
      question: 'O que é TypeScript?',
      options: [],
      correctIndex: 0,
      selectedIndex: null,
      expectedAnswer: 'Superset tipado de JavaScript',
      userTypedAnswer: 'Linguagem com tipos estáticos',
      aiFeedback: null,
      explanation: 'TypeScript adiciona tipagem ao JavaScript.',
      showExplanation: false,
      answered: false,
      attemptsHistory: [],
    };

    const onUpdateSingleQuestion = vi.fn();
    const onEvaluateOpenAnswer = vi.fn();

    render(
      <QuizPlayer
        questions={[openQuestion]}
        onUpdateSingleQuestion={onUpdateSingleQuestion}
        onEvaluateOpenAnswer={onEvaluateOpenAnswer}
        evaluatingIds={{}}
        onDiscussInChat={vi.fn()}
      />
    );

    expect(screen.getByText('O que é TypeScript?')).toBeInTheDocument();
    const evalButton = screen.getByText('Avaliar Resposta com IA');
    fireEvent.click(evalButton);
    expect(onEvaluateOpenAnswer).toHaveBeenCalledWith(openQuestion, 0);
  });

  it('does not trigger fireworks when completing battery with low score (e.g. 1 of 5)', () => {
    const fireworksSpy = vi.spyOn(fireworksModule, 'triggerFireworksAnimation');
    fireworksSpy.mockClear();

    const fiveQuestions: QuestionItem[] = [
      { id: 'q1', type: 'multiple_choice', question: 'Q1', options: ['A', 'B'], correctIndex: 0, selectedIndex: 0, answered: true, expectedAnswer: '', userTypedAnswer: '', aiFeedback: null, explanation: '', showExplanation: false }, // correto
      { id: 'q2', type: 'multiple_choice', question: 'Q2', options: ['A', 'B'], correctIndex: 0, selectedIndex: 1, answered: true, expectedAnswer: '', userTypedAnswer: '', aiFeedback: null, explanation: '', showExplanation: false }, // errado
      { id: 'q3', type: 'multiple_choice', question: 'Q3', options: ['A', 'B'], correctIndex: 0, selectedIndex: 1, answered: true, expectedAnswer: '', userTypedAnswer: '', aiFeedback: null, explanation: '', showExplanation: false }, // errado
      { id: 'q4', type: 'multiple_choice', question: 'Q4', options: ['A', 'B'], correctIndex: 0, selectedIndex: 1, answered: true, expectedAnswer: '', userTypedAnswer: '', aiFeedback: null, explanation: '', showExplanation: false }, // errado
      { id: 'q5', type: 'multiple_choice', question: 'Q5', options: ['A', 'B'], correctIndex: 0, selectedIndex: 1, answered: true, expectedAnswer: '', userTypedAnswer: '', aiFeedback: null, explanation: '', showExplanation: false }, // errado
    ];

    render(
      <QuizPlayer
        questions={fiveQuestions}
        onUpdateSingleQuestion={vi.fn()}
        onEvaluateOpenAnswer={vi.fn()}
        evaluatingIds={{}}
        onDiscussInChat={vi.fn()}
      />
    );

    // 1 de 5 (20%) não deve disparar fogos
    expect(fireworksSpy).not.toHaveBeenCalled();
    fireworksSpy.mockRestore();
  });

  it('triggers fireworks when completing battery with high score (e.g. 5 of 5)', () => {
    const fireworksSpy = vi.spyOn(fireworksModule, 'triggerFireworksAnimation');
    fireworksSpy.mockClear();

    const perfectQuestions: QuestionItem[] = [
      { id: 'q1', type: 'multiple_choice', question: 'Q1', options: ['A', 'B'], correctIndex: 0, selectedIndex: 0, answered: true, expectedAnswer: '', userTypedAnswer: '', aiFeedback: null, explanation: '', showExplanation: false },
      { id: 'q2', type: 'multiple_choice', question: 'Q2', options: ['A', 'B'], correctIndex: 1, selectedIndex: 1, answered: true, expectedAnswer: '', userTypedAnswer: '', aiFeedback: null, explanation: '', showExplanation: false },
    ];

    render(
      <QuizPlayer
        questions={perfectQuestions}
        onUpdateSingleQuestion={vi.fn()}
        onEvaluateOpenAnswer={vi.fn()}
        evaluatingIds={{}}
        onDiscussInChat={vi.fn()}
      />
    );

    // 2 de 2 (100%) deve disparar fogos
    expect(fireworksSpy).toHaveBeenCalled();
    fireworksSpy.mockRestore();
  });
});

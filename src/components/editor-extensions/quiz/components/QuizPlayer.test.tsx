import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuizPlayer from './QuizPlayer';
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
      })
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
    expect(evalButton).toBeInTheDocument();

    fireEvent.click(evalButton);
    expect(onEvaluateOpenAnswer).toHaveBeenCalledWith(openQuestion, 0);
  });
});

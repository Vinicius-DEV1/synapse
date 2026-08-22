import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { QuizPlayerCard } from './QuizPlayerCard';
import type { QuestionItem } from '../types';

describe('QuizPlayerCard Component', () => {
  const mockMultipleChoice: QuestionItem = {
    id: 'q_mc_1',
    type: 'multiple_choice',
    question: 'Quanto é 2 + 2?',
    options: ['3', '4', '5', '6'],
    correctIndex: 1,
    tags: ['matemática'],
    selectedIndex: null,
    expectedAnswer: '',
    userTypedAnswer: '',
    aiFeedback: null,
    explanation: '2 + 2 é igual a 4.',
    showExplanation: false,
    answered: false,
  };

  const mockOpenQuestion: QuestionItem = {
    id: 'q_open_1',
    type: 'open',
    question: 'Defina fotossíntese.',
    options: [],
    correctIndex: 0,
    tags: ['biologia'],
    selectedIndex: null,
    expectedAnswer: 'Processo realizado por plantas para converter luz em energia química.',
    userTypedAnswer: '',
    aiFeedback: null,
    explanation: 'Plantas usam clorofila para absorver luz solar.',
    showExplanation: false,
    answered: false,
  };

  it('renders multiple choice question and handles option selection', () => {
    const onUpdateSingleQuestion = vi.fn();
    const onEvaluateOpenAnswer = vi.fn();
    const onDiscussInChat = vi.fn();

    const { getByText } = render(
      <QuizPlayerCard
        q={mockMultipleChoice}
        qIndex={0}
        isEvaluating={false}
        onUpdateSingleQuestion={onUpdateSingleQuestion}
        onEvaluateOpenAnswer={onEvaluateOpenAnswer}
        onDiscussInChat={onDiscussInChat}
      />
    );

    expect(getByText('Quanto é 2 + 2?')).toBeDefined();
    expect(getByText('4')).toBeDefined();

    const optionBtn = getByText('4');
    fireEvent.click(optionBtn);

    expect(onUpdateSingleQuestion).toHaveBeenCalledWith(
      'q_mc_1',
      expect.objectContaining({
        selectedIndex: 1,
        answered: true,
      }),
      true
    );
  });

  it('renders open question with textarea and evaluate button', () => {
    const onUpdateSingleQuestion = vi.fn();
    const onEvaluateOpenAnswer = vi.fn();
    const onDiscussInChat = vi.fn();

    const { getByPlaceholderText, getByText } = render(
      <QuizPlayerCard
        q={mockOpenQuestion}
        qIndex={1}
        isEvaluating={false}
        onUpdateSingleQuestion={onUpdateSingleQuestion}
        onEvaluateOpenAnswer={onEvaluateOpenAnswer}
        onDiscussInChat={onDiscussInChat}
      />
    );

    expect(getByText('Defina fotossíntese.')).toBeDefined();
    const textarea = getByPlaceholderText(/Escreva sua resposta detalhada/i);
    expect(textarea).toBeDefined();

    fireEvent.change(textarea, { target: { value: 'Conversão de luz em açúcar' } });
    expect(onUpdateSingleQuestion).toHaveBeenCalledWith(
      'q_open_1',
      expect.objectContaining({ userTypedAnswer: 'Conversão de luz em açúcar' })
    );
  });
});

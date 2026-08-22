import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import QuizEditor from './QuizEditor';
import type { QuestionItem } from '../types';

describe('QuizEditor Component', () => {
  const mockQuestions: QuestionItem[] = [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'Qual a capital da França?',
      options: ['Londres', 'Paris', 'Berlim', 'Roma'],
      correctIndex: 1,
      tags: ['geografia'],
      selectedIndex: null,
      expectedAnswer: '',
      userTypedAnswer: '',
      aiFeedback: null,
      explanation: 'Paris é a capital da França.',
      showExplanation: false,
      answered: false,
    },
  ];

  it('renders questions list and Add Question button', () => {
    const onUpdateQuestion = vi.fn();
    const onToggleQuestionType = vi.fn();
    const onMoveQuestion = vi.fn();
    const onDeleteQuestion = vi.fn();
    const onAddQuestion = vi.fn();

    const { getByText } = render(
      <QuizEditor
        questions={mockQuestions}
        onUpdateQuestion={onUpdateQuestion}
        onToggleQuestionType={onToggleQuestionType}
        onMoveQuestion={onMoveQuestion}
        onDeleteQuestion={onDeleteQuestion}
        onAddQuestion={onAddQuestion}
      />
    );

    expect(getByText('Adicionar Nova Questão')).toBeDefined();

    const addBtn = getByText('Adicionar Nova Questão');
    fireEvent.click(addBtn);
    expect(onAddQuestion).toHaveBeenCalled();
  });
});

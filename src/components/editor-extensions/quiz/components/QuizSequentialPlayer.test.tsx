import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuizSequentialPlayer from './QuizSequentialPlayer';
import * as fireworksModule from '../utils/fireworks';
import type { QuestionItem } from '../types';

describe('QuizSequentialPlayer Unit Tests', () => {
  const mockQuestions: QuestionItem[] = [
    {
      id: 'q1',
      type: 'multiple_choice',
      question: 'Qual a capital do Brasil?',
      options: ['Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador'],
      correctIndex: 0,
      tags: ['Geografia'],
      selectedIndex: null,
      expectedAnswer: '',
      userTypedAnswer: '',
      aiFeedback: null,
      explanation: 'Brasília foi inaugurada em 1960 como capital.',
      showExplanation: false,
      answered: false,
    },
    {
      id: 'q2',
      type: 'open',
      question: 'Explique o conceito de polimorfismo em POO.',
      options: [],
      correctIndex: 0,
      tags: ['Programação'],
      selectedIndex: null,
      expectedAnswer: 'Capacidade de objetos de diferentes classes responderem à mesma mensagem.',
      userTypedAnswer: '',
      aiFeedback: null,
      explanation: 'Polimorfismo permite reutilização de código.',
      showExplanation: false,
      answered: false,
    },
  ];

  it('renders first question by default with stepper 1 / 2', () => {
    const onUpdate = vi.fn();
    const onEval = vi.fn();
    const onDiscuss = vi.fn();

    render(
      <QuizSequentialPlayer
        questions={mockQuestions}
        onUpdateSingleQuestion={onUpdate}
        onEvaluateOpenAnswer={onEval}
        evaluatingIds={{}}
        onDiscussInChat={onDiscuss}
      />
    );

    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
    expect(screen.getByText('Qual a capital do Brasil?')).toBeInTheDocument();
    expect(screen.getByText('Brasília')).toBeInTheDocument();
    expect(screen.getByText('São Paulo')).toBeInTheDocument();
  });

  it('handles multiple choice option selection', () => {
    const onUpdate = vi.fn();
    const onEval = vi.fn();
    const onDiscuss = vi.fn();

    render(
      <QuizSequentialPlayer
        questions={mockQuestions}
        onUpdateSingleQuestion={onUpdate}
        onEvaluateOpenAnswer={onEval}
        evaluatingIds={{}}
        onDiscussInChat={onDiscuss}
      />
    );

    const optionBtn = screen.getByText('Brasília').closest('button');
    expect(optionBtn).toBeInTheDocument();
    if (optionBtn) fireEvent.click(optionBtn);

    expect(onUpdate).toHaveBeenCalledWith(
      'q1',
      expect.objectContaining({
        selectedIndex: 0,
        answered: true,
      }),
      true
    );
  });

  it('navigates to next question when clicking Próxima Questão', () => {
    const onUpdate = vi.fn();
    const onEval = vi.fn();
    const onDiscuss = vi.fn();

    render(
      <QuizSequentialPlayer
        questions={mockQuestions}
        onUpdateSingleQuestion={onUpdate}
        onEvaluateOpenAnswer={onEval}
        evaluatingIds={{}}
        onDiscussInChat={onDiscuss}
      />
    );

    const nextBtn = screen.getByText('Próxima Questão').closest('button');
    expect(nextBtn).toBeInTheDocument();
    if (nextBtn) fireEvent.click(nextBtn);

    expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
    expect(screen.getByText('Explique o conceito de polimorfismo em POO.')).toBeInTheDocument();
  });

  it('renders open question with textarea and submit button', () => {
    const onUpdate = vi.fn();
    const onEval = vi.fn();
    const onDiscuss = vi.fn();

    // Inicia na questão 2
    const questionsWithOpenActive = [mockQuestions[1]];

    render(
      <QuizSequentialPlayer
        questions={questionsWithOpenActive}
        onUpdateSingleQuestion={onUpdate}
        onEvaluateOpenAnswer={onEval}
        evaluatingIds={{}}
        onDiscussInChat={onDiscuss}
      />
    );

    expect(screen.getByPlaceholderText(/Escreva sua resposta completa/)).toBeInTheDocument();
    expect(screen.getByText('Enviar Resposta para Avaliação IA')).toBeInTheDocument();
  });

  it('shows summary view when completing the battery and allows resetting', () => {
    const onUpdate = vi.fn();
    const onEval = vi.fn();
    const onDiscuss = vi.fn();
    const onSwitch = vi.fn();

    const answeredQuestions: QuestionItem[] = [
      {
        ...mockQuestions[0],
        answered: true,
        selectedIndex: 0,
      },
    ];

    render(
      <QuizSequentialPlayer
        questions={answeredQuestions}
        onUpdateSingleQuestion={onUpdate}
        onEvaluateOpenAnswer={onEval}
        evaluatingIds={{}}
        onDiscussInChat={onDiscuss}
        onSwitchToListLayout={onSwitch}
      />
    );

    const finishBtn = screen.getByText('Finalizar Bateria').closest('button');
    if (finishBtn) fireEvent.click(finishBtn);

    expect(screen.getByText('Bateria Concluída!')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();

    const resetBtn = screen.getByText('Refazer Bateria').closest('button');
    if (resetBtn) fireEvent.click(resetBtn);

    expect(onUpdate).toHaveBeenCalledWith(
      'q1',
      expect.objectContaining({
        answered: false,
        selectedIndex: null,
      }),
      true
    );
  });

  it('does not trigger fireworks on initial mount when questions were already answered', () => {
    const fireworksSpy = vi.spyOn(fireworksModule, 'triggerFireworksAnimation');
    fireworksSpy.mockClear();

    const alreadyCompleted: QuestionItem[] = [
      {
        ...mockQuestions[0],
        answered: true,
        selectedIndex: 0,
      },
    ];

    render(
      <QuizSequentialPlayer
        questions={alreadyCompleted}
        onUpdateSingleQuestion={vi.fn()}
        onEvaluateOpenAnswer={vi.fn()}
        evaluatingIds={{}}
        onDiscussInChat={vi.fn()}
      />
    );

    // Opening an already completed note should not spam fireworks
    expect(fireworksSpy).not.toHaveBeenCalled();
    fireworksSpy.mockRestore();
  });
});


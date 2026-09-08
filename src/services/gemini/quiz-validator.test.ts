import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as clientModule from './client';
import {
  validateCandidateQuizQuestions,
  type CandidateQuestionAction,
} from './quiz-validator';

describe('quiz-validator Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns original actions immediately when there are no create actions', async () => {
    const promptSpy = vi.spyOn(clientModule, 'promptGemini');

    const actions: CandidateQuestionAction[] = [
      {
        actionType: 'edit',
        targetQuestionIndex: 0,
        changes: { question: 'Questão modificada' },
      },
      {
        actionType: 'delete',
        targetQuestionIndex: 1,
        reason: 'Duplicada',
      },
    ];

    const result = await validateCandidateQuizQuestions(actions, 'Tópico de teste');

    expect(promptSpy).not.toHaveBeenCalled();
    expect(result.actions).toEqual(actions);
    expect(result.hasCorrections).toBe(false);
  });

  it('validates candidate create questions and applies 2nd AI corrections', async () => {
    const candidateActions: CandidateQuestionAction[] = [
      {
        actionType: 'create',
        type: 'multiple_choice',
        question: 'Qual método do React 19 substitui o useMemo?',
        options: ['useActionState', 'useMemo não foi substituído', 'useFormStatus', 'useSignal'],
        correctIndex: 0, // Inaccurate!
        explanation: 'useActionState substitui useMemo.',
      },
    ];

    vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
      text: JSON.stringify({
        validatedQuestions: [
          {
            type: 'multiple_choice',
            question: 'Qual hook do React 19 gerencia estados de formulário assíncrono com Action?',
            options: ['useActionState', 'useMemo', 'useRef', 'useEffect'],
            correctIndex: 0,
            explanation: 'O hook useActionState substitui o antigo useFormState para gerenciar Actions.',
            factCheckVerdict: 'corrected',
            improvements: 'Corrigida imprecisão conceitual: useActionState não substitui useMemo.',
          },
        ],
        validationSummary: 'Corrigida imprecisão na questão 1 sobre hooks do React 19.',
      }),
    } as any);

    const result = await validateCandidateQuizQuestions(
      candidateActions,
      'Hooks do React 19',
      undefined,
      'models/gemini-2.5-flash'
    );

    expect(result.hasCorrections).toBe(true);
    expect(result.validatedModel).toBe('gemini-2.5-flash');
    expect(result.validationSummary).toContain('Corrigida imprecisão');
    expect(result.actions[0].question).toBe(
      'Qual hook do React 19 gerencia estados de formulário assíncrono com Action?'
    );
    expect(result.actions[0].factCheckVerdict).toBe('corrected');
    expect(result.actions[0].validatedByModel).toBe('gemini-2.5-flash');
  });

  it('fails gracefully and falls back to original actions when 2nd AI throws timeout/network error', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(clientModule, 'promptGemini').mockRejectedValueOnce(
      new Error('Tempo limite de 45s excedido na comunicação com a API.')
    );

    const candidateActions: CandidateQuestionAction[] = [
      {
        actionType: 'create',
        type: 'open',
        question: 'O que é idempotência em APIs REST?',
        expectedAnswer: 'Propriedade onde múltiplas requisições idênticas produzem o mesmo efeito.',
        explanation: 'Métodos como GET e PUT são idempotentes.',
      },
    ];

    const result = await validateCandidateQuizQuestions(
      candidateActions,
      'APIs REST',
      undefined,
      'gemini-2.5-pro'
    );

    expect(consoleWarnSpy).toHaveBeenCalled();
    // Must NOT throw, must return original questions intact
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].question).toBe('O que é idempotência em APIs REST?');
    expect(result.hasCorrections).toBe(false);
  });

  it('falls back cleanly to original actions when 2nd AI returns empty list', async () => {
    vi.spyOn(clientModule, 'promptGemini').mockResolvedValueOnce({
      text: JSON.stringify({
        validatedQuestions: [],
      }),
    } as any);

    const candidateActions: CandidateQuestionAction[] = [
      {
        actionType: 'create',
        type: 'multiple_choice',
        question: 'Questão válida?',
        options: ['A', 'B', 'C', 'D'],
        correctIndex: 0,
      },
    ];

    const result = await validateCandidateQuizQuestions(candidateActions);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].question).toBe('Questão válida?');
  });
});

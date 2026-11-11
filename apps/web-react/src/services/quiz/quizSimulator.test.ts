import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../db-web';
import { webQuizApi } from '../../api/web/quiz';
import { generateErrorNotebook, generateFilteredStudySession } from './quizSimulator';

describe('quizSimulator Service', () => {
  let api: ReturnType<typeof webQuizApi>;
  let idCounter = 0;
  const generateId = () => `sim-test-${++idCounter}`;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('quiz_batteries');
    await db.clear('quiz_questions');
    await db.clear('quiz_attempts');
    await db.clear('quiz_page_links');
    api = webQuizApi(db, generateId);
  });

  it('generates a "Caderno de Erros" practice session from latest wrong attempts', async () => {
    const battery = await api.saveBattery({ title: 'Bateria Inicial' });
    const q1 = await api.saveQuestion({
      battery_id: battery.id,
      question: 'Pergunta Correta',
      options: ['A', 'B'],
      correct_index: 0,
    });
    const q2 = await api.saveQuestion({
      battery_id: battery.id,
      question: 'Pergunta com Erro',
      options: ['A', 'B'],
      correct_index: 1,
    });

    // Mark Q1 correct, Q2 wrong
    await api.saveAttempt({
      question_id: q1.id,
      battery_id: battery.id,
      type: 'multiple_choice',
      selected_index: 0,
      is_correct: true,
    });
    await api.saveAttempt({
      question_id: q2.id,
      battery_id: battery.id,
      type: 'multiple_choice',
      selected_index: 0,
      is_correct: false,
    });

    const errorSession = await generateErrorNotebook(api);
    expect(errorSession).not.toBeNull();
    expect(errorSession?.battery.title).toContain('Caderno de Erros');
    expect(errorSession?.questions).toHaveLength(1);
    expect(errorSession?.questions[0].id).toBe(q2.id);
  });

  it('returns null if there are no wrong attempts', async () => {
    const battery = await api.saveBattery({ title: 'Bateria Limpa' });
    const q1 = await api.saveQuestion({
      battery_id: battery.id,
      question: 'Pergunta',
      options: ['A'],
      correct_index: 0,
    });
    await api.saveAttempt({
      question_id: q1.id,
      battery_id: battery.id,
      type: 'multiple_choice',
      selected_index: 0,
      is_correct: true,
    });

    const errorSession = await generateErrorNotebook(api);
    expect(errorSession).toBeNull();
  });

  it('generates filtered study session by tags with limit and status', async () => {
    const b1 = await api.saveBattery({ title: 'Bateria A' });
    const b2 = await api.saveBattery({ title: 'Bateria B' });

    // Q1 in B1: tag "react"
    const q1 = await api.saveQuestion({
      battery_id: b1.id,
      question: 'Q1 React',
      options: ['A'],
      correct_index: 0,
      tags: ['react'],
    });

    // Q2 in B1: tag "vue"
    await api.saveQuestion({
      battery_id: b1.id,
      question: 'Q2 Vue',
      options: ['A'],
      correct_index: 0,
      tags: ['vue'],
    });

    // Q3 in B2: tag "react"
    const q3 = await api.saveQuestion({
      battery_id: b2.id,
      question: 'Q3 React',
      options: ['A'],
      correct_index: 0,
      tags: ['react'],
    });

    // Mark Q1 as answered
    await api.saveAttempt({
      question_id: q1.id,
      battery_id: b1.id,
      type: 'multiple_choice',
      selected_index: 0,
      is_correct: true,
    });

    // Filter only "react" tags
    const reactSession = await generateFilteredStudySession(api, {
      tags: ['react'],
    });
    expect(reactSession).not.toBeNull();
    expect(reactSession?.questions).toHaveLength(2);
    expect(reactSession?.questions.map((q) => q.id)).toContain(q1.id);
    expect(reactSession?.questions.map((q) => q.id)).toContain(q3.id);

    // Filter "react" AND only "unanswered" questions
    const unansweredSession = await generateFilteredStudySession(api, {
      tags: ['react'],
      status: 'unanswered',
    });
    expect(unansweredSession).not.toBeNull();
    expect(unansweredSession?.questions).toHaveLength(1);
    expect(unansweredSession?.questions[0].id).toBe(q3.id);

    // Filter with limit = 1
    const limitedSession = await generateFilteredStudySession(api, {
      tags: ['react'],
      limit: 1,
    });
    expect(limitedSession?.questions).toHaveLength(1);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../../../services/db-web';
import { webQuizApi } from './index';

describe('webQuizApi (IndexedDB)', () => {
  let api: ReturnType<typeof webQuizApi>;
  let idCounter = 0;
  const generateId = () => `quiz-test-${++idCounter}`;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('quiz_batteries');
    await db.clear('quiz_questions');
    await db.clear('quiz_attempts');
    await db.clear('quiz_page_links');
    api = webQuizApi(db, generateId);
  });

  it('performs CRUD on quiz batteries, including soft-delete and restore', async () => {
    const battery = await api.saveBattery({
      title: 'Bateria de Teste Redes',
      description: 'Questões sobre modelo OSI',
      page_id: 'page-1',
      tags: ['redes', 'osi'],
    });

    expect(battery.id).toBeDefined();
    expect(battery.title).toBe('Bateria de Teste Redes');
    expect(battery.page_id).toBe('page-1');
    expect(battery.tags).toEqual(['redes', 'osi']);

    let all = await api.getAllBatteries();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(battery.id);

    const byPage = await api.getBatteriesByPage('page-1');
    expect(byPage).toHaveLength(1);
    expect(byPage[0].id).toBe(battery.id);

    // Soft delete
    const deleted = await api.deleteBattery(battery.id);
    expect(deleted).toBe(true);

    all = await api.getAllBatteries();
    expect(all).toHaveLength(0);

    const byIdDeleted = await api.getBatteryById(battery.id);
    expect(byIdDeleted).toBeNull();

    // Restore
    const restored = await api.restoreBattery(battery.id);
    expect(restored).toBe(true);

    all = await api.getAllBatteries();
    expect(all).toHaveLength(1);
  });

  it('manages questions and supports batch saves in sort order', async () => {
    const battery = await api.saveBattery({ title: 'Bateria Algoritmos' });

    const questions = await api.saveQuestionsBatch([
      {
        battery_id: battery.id,
        question: 'Questão 2: Qual a complexidade do QuickSort?',
        options: ['O(N)', 'O(N log N)', 'O(1)'],
        correct_index: 1,
        sort_order: 2,
        tags: ['algoritmos'],
      },
      {
        battery_id: battery.id,
        question: 'Questão 1: O que é um grafo?',
        options: ['Estrutura com vértices e arestas', 'Lista encadeada'],
        correct_index: 0,
        sort_order: 1,
        tags: ['estruturas'],
      },
    ]);

    expect(questions).toHaveLength(2);

    const fromDb = await api.getQuestionsByBattery(battery.id);
    expect(fromDb).toHaveLength(2);
    // Verified sorted order
    expect(fromDb[0].sort_order).toBe(1);
    expect(fromDb[0].question).toContain('Questão 1');
    expect(fromDb[1].sort_order).toBe(2);
    expect(fromDb[1].question).toContain('Questão 2');

    // Delete single question
    await api.deleteQuestion(fromDb[0].id);
    const afterDelete = await api.getQuestionsByBattery(battery.id);
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0].id).toBe(fromDb[1].id);
  });

  it('records attempts and tracks wrong answers for Caderno de Erros', async () => {
    const battery = await api.saveBattery({ title: 'Bateria Erros' });
    const q1 = await api.saveQuestion({
      battery_id: battery.id,
      question: 'Pergunta 1',
      options: ['A', 'B'],
      correct_index: 0,
    });
    const q2 = await api.saveQuestion({
      battery_id: battery.id,
      question: 'Pergunta 2',
      options: ['A', 'B'],
      correct_index: 1,
    });

    // Attempt 1 for Q1: Correct
    await api.saveAttempt({
      question_id: q1.id,
      battery_id: battery.id,
      type: 'multiple_choice',
      selected_index: 0,
      is_correct: true,
    });

    // Attempt 1 for Q2: Incorrect
    await api.saveAttempt({
      question_id: q2.id,
      battery_id: battery.id,
      type: 'multiple_choice',
      selected_index: 0,
      is_correct: false,
    });

    const latest = await api.getLatestAttempts(battery.id);
    expect(latest[q1.id]?.is_correct).toBe(true);
    expect(latest[q2.id]?.is_correct).toBe(false);

    const wrong = await api.getWrongAttempts();
    expect(wrong).toHaveLength(1);
    expect(wrong[0].question_id).toBe(q2.id);

    // Retrying Q2 with correct answer
    await api.saveAttempt({
      question_id: q2.id,
      battery_id: battery.id,
      type: 'multiple_choice',
      selected_index: 1,
      is_correct: true,
    });

    const wrongAfterRetry = await api.getWrongAttempts();
    expect(wrongAfterRetry).toHaveLength(0);
  });

  it('computes accurate global statistics and tag distribution', async () => {
    const battery = await api.saveBattery({ title: 'Bateria Stats' });
    const q1 = await api.saveQuestion({
      battery_id: battery.id,
      question: 'Q1',
      options: ['A', 'B'],
      correct_index: 0,
      tags: ['direito', 'constitucional'],
    });
    const q2 = await api.saveQuestion({
      battery_id: battery.id,
      question: 'Q2',
      options: ['A', 'B'],
      correct_index: 1,
      tags: ['direito', 'penal'],
    });
    const q3 = await api.saveQuestion({
      battery_id: battery.id,
      question: 'Q3',
      options: ['A', 'B'],
      correct_index: 0,
      tags: ['ti'],
    });

    // Answer Q1 correctly, Q2 incorrectly, leave Q3 unanswered
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

    const stats = await api.getStats();
    expect(stats.totalBatteries).toBe(1);
    expect(stats.totalQuestions).toBe(3);
    expect(stats.answeredQuestions).toBe(2);
    expect(stats.correctAnswers).toBe(1);
    expect(stats.incorrectAnswers).toBe(1);
    expect(stats.accuracyRate).toBe(50); // 1 correct out of 2 answered = 50%

    // Tag breakdown checks
    expect(stats.tagStats['direito']?.total).toBe(2);
    expect(stats.tagStats['direito']?.answered).toBe(2);
    expect(stats.tagStats['direito']?.correct).toBe(1);

    expect(stats.tagStats['ti']?.total).toBe(1);
    expect(stats.tagStats['ti']?.answered).toBe(0);
  });

  it('manages page links and retrieves composite battery with questions and pages', async () => {
    const battery = await api.saveBattery({
      title: 'Bateria Redes Link',
      page_id: 'page-master',
    });

    await api.linkBatteryToPage(battery.id, 'page-secondary');

    const links = await api.getLinksByBattery(battery.id);
    expect(links).toHaveLength(1);
    expect(links[0].page_id).toBe('page-secondary');

    const composite = await api.getBatteryWithQuestions(battery.id);
    expect(composite).not.toBeNull();
    expect(composite?.id).toBe(battery.id);

    // Unlink
    await api.unlinkBatteryFromPage(battery.id, 'page-secondary');
    const linksAfterUnlink = await api.getLinksByBattery(battery.id);
    expect(linksAfterUnlink).toHaveLength(0);
  });
});

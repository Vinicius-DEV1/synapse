import { describe, it, expect, beforeEach } from 'vitest';
import { getWebDb } from '../db-web';
import { webQuizApi } from '../../api/web/quiz';
import { migratePageContentQuizzes } from './quizMigration';

describe('quizMigration Service', () => {
  let api: ReturnType<typeof webQuizApi>;
  let idCounter = 0;
  const generateId = () => `mig-test-${++idCounter}`;

  beforeEach(async () => {
    const db = await getWebDb();
    await db.clear('quiz_batteries');
    await db.clear('quiz_questions');
    await db.clear('quiz_attempts');
    await db.clear('quiz_page_links');
    api = webQuizApi(db, generateId);
  });

  it('migrates legacy TipTap JSON content with inline questions into normalized DB tables', async () => {
    const legacyDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Anotações sobre Redes' }],
        },
        {
          type: 'questionBlock',
          attrs: {
            title: 'Bateria TCP/IP',
            description: 'Questões da prova',
            layout: 'sequential',
            questions: [
              {
                id: 'legacy-q1',
                type: 'multiple_choice',
                question: 'Qual a porta do HTTP?',
                options: ['80', '443', '21'],
                correctIndex: 0,
                tags: ['redes', 'portas'],
                selectedIndex: 0,
                answered: true,
              },
              {
                id: 'legacy-q2',
                type: 'open',
                question: 'Explique o Three-Way Handshake.',
                options: [],
                correctIndex: 0,
                expectedAnswer: 'SYN, SYN-ACK, ACK',
                tags: ['redes', 'tcp'],
              },
            ],
          },
        },
      ],
    };

    const result = await migratePageContentQuizzes('page-101', 'Página de Redes', legacyDoc, api);

    expect(result.migrated).toBe(true);
    expect(result.migratedCount).toBe(1);
    expect(result.batteryIds).toHaveLength(1);

    const batteryId = result.batteryIds[0];

    // Verify in database
    const savedBattery = await api.getBatteryById(batteryId);
    expect(savedBattery).not.toBeNull();
    expect(savedBattery?.title).toBe('Bateria TCP/IP');
    expect(savedBattery?.page_id).toBe('page-101');

    const savedQuestions = await api.getQuestionsByBattery(batteryId);
    expect(savedQuestions).toHaveLength(2);
    expect(savedQuestions[0].question).toBe('Qual a porta do HTTP?');
    expect(savedQuestions[1].question).toBe('Explique o Three-Way Handshake.');

    // Check attempts were recorded for answered legacy question
    const latestAttempts = await api.getLatestAttempts(batteryId);
    expect(latestAttempts['legacy-q1']?.is_correct).toBe(true);

    // Verify new content attributes are clean embed references without heavy JSON
    const newDoc = result.newContent as any;
    const blockNode = newDoc.content[1];
    expect(blockNode.attrs.batteryId).toBe(batteryId);
    expect(blockNode.attrs.cachedTitle).toBe('Bateria TCP/IP');
    expect(blockNode.attrs.cachedCount).toBe(2);
    expect(blockNode.attrs.questions).toBeUndefined();
  });

  it('migrates legacy HTML string containing data-type="question-block"', async () => {
    const questionsJson = JSON.stringify([
      {
        id: 'html-q1',
        type: 'multiple_choice',
        question: 'HTML é linguagem de programação?',
        options: ['Sim', 'Não'],
        correctIndex: 1,
        tags: ['web'],
      },
    ]);

    const legacyHtml = `
      <p>Texto inicial</p>
      <div data-type="question-block" class="question-block" data-title="Bateria Web" data-questions="${encodeURIComponent(questionsJson)}"></div>
    `;

    const result = await migratePageContentQuizzes('page-202', 'Página Web', legacyHtml, api);

    expect(result.migrated).toBe(true);
    expect(result.batteryIds).toHaveLength(1);

    const batteryId = result.batteryIds[0];
    const savedBattery = await api.getBatteryById(batteryId);
    expect(savedBattery?.title).toBe('Bateria Web');

    const questions = await api.getQuestionsByBattery(batteryId);
    expect(questions).toHaveLength(1);
    expect(questions[0].question).toBe('HTML é linguagem de programação?');

    // Verify HTML output contains embed attributes and has stripped raw JSON
    const newHtml = result.newContent as string;
    expect(newHtml).toContain(`data-battery-id="${batteryId}"`);
    expect(newHtml).not.toContain('data-questions=');
  });

  it('skips already migrated content safely', async () => {
    const alreadyMigratedDoc = {
      type: 'doc',
      content: [
        {
          type: 'questionBlock',
          attrs: {
            batteryId: 'bat-already-migrated',
            cachedTitle: 'Já migrada',
            cachedCount: 5,
          },
        },
      ],
    };

    const result = await migratePageContentQuizzes('page-303', 'Página', alreadyMigratedDoc, api);
    expect(result.migrated).toBe(false);
    expect(result.batteryIds).toEqual(['bat-already-migrated']);
  });
});

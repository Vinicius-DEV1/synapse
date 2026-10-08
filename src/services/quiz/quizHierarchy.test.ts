import { describe, it, expect } from 'vitest';
import {
  buildBatteryHierarchy,
  getDescendantQuestions,
  getBatteryBreadcrumb,
  getAvailableParentOptions,
} from './quizHierarchy';
import type { BatteryWithQuestions, QuizQuestion } from '../../types/quiz';

function makeMockQuestion(id: string, batteryId: string, text: string): QuizQuestion {
  return {
    id,
    battery_id: batteryId,
    type: 'multiple_choice',
    question: text,
    options: ['A', 'B'],
    correct_index: 0,
    tags: [],
    sort_order: 1,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };
}

describe('quizHierarchy Service Unit Tests', () => {
  const mockBatteries: BatteryWithQuestions[] = [
    {
      id: 'root_js',
      parent_id: null,
      title: 'JAVASCRIPT',
      layout: 'sequential',
      tags: ['web'],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      questions: [makeMockQuestion('q_js_1', 'root_js', 'JS Root Q1')],
      latestAttempts: {
        q_js_1: { id: 'att_1', question_id: 'q_js_1', battery_id: 'root_js', type: 'multiple_choice', is_correct: true, created_at: '2026-01-01' },
      },
    },
    {
      id: 'sub_js_basic',
      parent_id: 'root_js',
      title: 'js-básico',
      layout: 'sequential',
      tags: ['iniciante'],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      questions: [
        makeMockQuestion('q_basic_1', 'sub_js_basic', 'Basic Q1'),
        makeMockQuestion('q_basic_2', 'sub_js_basic', 'Basic Q2'),
      ],
      latestAttempts: {
        q_basic_1: { id: 'att_2', question_id: 'q_basic_1', battery_id: 'sub_js_basic', type: 'multiple_choice', is_correct: true, created_at: '2026-01-01' },
        q_basic_2: { id: 'att_3', question_id: 'q_basic_2', battery_id: 'sub_js_basic', type: 'multiple_choice', is_correct: false, created_at: '2026-01-01' },
      },
    },
    {
      id: 'sub_js_adv',
      parent_id: 'root_js',
      title: 'js-avançado',
      layout: 'sequential',
      tags: ['senior'],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      questions: [makeMockQuestion('q_adv_1', 'sub_js_adv', 'Adv Q1')],
    },
    {
      id: 'sub_js_async',
      parent_id: 'sub_js_adv',
      title: 'async-await',
      layout: 'sequential',
      tags: ['async'],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      questions: [makeMockQuestion('q_async_1', 'sub_js_async', 'Async Q1')],
    },
    {
      id: 'root_csharp',
      parent_id: null,
      title: 'C# .NET',
      layout: 'sequential',
      tags: ['backend'],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
      questions: [],
    },
  ];

  describe('buildBatteryHierarchy', () => {
    it('returns empty array when passed empty list', () => {
      expect(buildBatteryHierarchy([])).toEqual([]);
    });

    it('organizes flat batteries into multi-level nested tree', () => {
      const tree = buildBatteryHierarchy(mockBatteries);

      expect(tree).toHaveLength(2); // root_csharp and root_js
      const jsNode = tree.find((n) => n.id === 'root_js');
      expect(jsNode).toBeDefined();
      expect(jsNode!.children).toHaveLength(2); // sub_js_basic, sub_js_adv

      const advNode = jsNode!.children.find((n) => n.id === 'sub_js_adv');
      expect(advNode).toBeDefined();
      expect(advNode!.children).toHaveLength(1); // sub_js_async
      expect(advNode!.children[0].id).toBe('sub_js_async');
    });

    it('aggregates question counts and accuracy rates bottom-up', () => {
      const tree = buildBatteryHierarchy(mockBatteries);
      const jsNode = tree.find((n) => n.id === 'root_js')!;

      // 1 root question + 2 basic questions + 1 adv question + 1 async question = 5 total
      expect(jsNode.totalDescendantQuestionsCount).toBe(5);

      // Answered: 1 root + 2 basic = 3 answered
      expect(jsNode.totalDescendantAnsweredCount).toBe(3);

      // Correct: 1 root + 1 basic = 2 correct -> 2/3 = 67%
      expect(jsNode.totalDescendantCorrectCount).toBe(2);
      expect(jsNode.aggregateAccuracyRate).toBe(67);
    });
  });

  describe('getDescendantQuestions', () => {
    it('collects all questions recursively from root and all sub-batteries', () => {
      const allJsQuestions = getDescendantQuestions('root_js', mockBatteries);
      expect(allJsQuestions).toHaveLength(5);
      expect(allJsQuestions.map((q) => q.id)).toEqual([
        'q_js_1',
        'q_basic_1',
        'q_basic_2',
        'q_adv_1',
        'q_async_1',
      ]);
    });

    it('returns only own questions for leaf sub-battery', () => {
      const basicQuestions = getDescendantQuestions('sub_js_basic', mockBatteries);
      expect(basicQuestions).toHaveLength(2);
    });
  });

  describe('getBatteryBreadcrumb', () => {
    it('builds ancestor trail from root down to targeted sub-battery', () => {
      const breadcrumb = getBatteryBreadcrumb('sub_js_async', mockBatteries);
      expect(breadcrumb).toEqual([
        { id: 'root_js', title: 'JAVASCRIPT' },
        { id: 'sub_js_adv', title: 'js-avançado' },
        { id: 'sub_js_async', title: 'async-await' },
      ]);
    });

    it('returns single item for root battery', () => {
      const breadcrumb = getBatteryBreadcrumb('root_js', mockBatteries);
      expect(breadcrumb).toEqual([{ id: 'root_js', title: 'JAVASCRIPT' }]);
    });
  });

  describe('getAvailableParentOptions', () => {
    it('excludes self and all descendants to prevent circular references', () => {
      // If we are editing 'sub_js_adv', it cannot choose itself or 'sub_js_async' as parent!
      const options = getAvailableParentOptions('sub_js_adv', mockBatteries);
      const optionIds = options.map((o) => o.id);

      expect(optionIds).toContain('root_js');
      expect(optionIds).toContain('sub_js_basic');
      expect(optionIds).toContain('root_csharp');
      expect(optionIds).not.toContain('sub_js_adv');
      expect(optionIds).not.toContain('sub_js_async');
    });

    it('returns all batteries when creating a new battery (no id)', () => {
      const options = getAvailableParentOptions(null, mockBatteries);
      expect(options).toHaveLength(mockBatteries.length);
    });
  });
});

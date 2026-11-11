import type { IQuizApi } from '../../api/contracts/quiz';
import type { QuestionItem } from '../../components/editor-extensions/quiz/types';
import { normalizeQuizQuestions } from '../../components/editor-extensions/quiz/utils/quizNormalizer';

interface TipTapNodeLike {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNodeLike[];
  [key: string]: unknown;
}

export interface MigrationResult {
  migrated: boolean;
  migratedCount: number;
  batteryIds: string[];
  newContent: string | Record<string, unknown>;
}

/**
 * Migrates legacy inline quiz questions from page content into the normalized database tables.
 * Replaces heavy JSON attributes in TipTap with lightweight embed reference attributes.
 */
export async function migratePageContentQuizzes(
  pageId: string,
  pageTitle: string,
  content: string | TipTapNodeLike | Record<string, unknown>,
  quizApi: IQuizApi
): Promise<MigrationResult> {
  if (!content) {
    return { migrated: false, migratedCount: 0, batteryIds: [], newContent: content };
  }

  let migratedCount = 0;
  const batteryIds: string[] = [];

  // Helper to extract & persist a legacy battery
  const persistLegacyBattery = async (
    rawTitle: unknown,
    rawDescription: unknown,
    rawLayout: unknown,
    rawQuestions: unknown,
    existingBatteryId?: string
  ): Promise<{ batteryId: string; title: string; count: number; tags: string[] }> => {
    const questions: QuestionItem[] = normalizeQuizQuestions(rawQuestions);
    const title = typeof rawTitle === 'string' && rawTitle.trim() ? rawTitle.trim() : 'Bateria de Exercícios';
    const description = typeof rawDescription === 'string' ? rawDescription : '';
    const layout = rawLayout === 'list' ? 'list' : 'sequential';

    // Collect unique tags
    const tagSet = new Set<string>();
    questions.forEach((q) => {
      if (Array.isArray(q.tags)) {
        q.tags.forEach((t) => {
          if (t && t.trim()) tagSet.add(t.trim());
        });
      }
    });
    const tags = Array.from(tagSet);

    // Save or update battery
    const battery = await quizApi.saveBattery({
      id: existingBatteryId,
      page_id: pageId,
      title,
      description,
      layout,
      tags,
    });

    batteryIds.push(battery.id);
    await quizApi.linkBatteryToPage(battery.id, pageId);

    // Persist all questions in batch
    const questionRecords = questions.map((q, idx) => ({
      id: q.id,
      battery_id: battery.id,
      type: q.type,
      question: q.question,
      options: q.options,
      correct_index: q.correctIndex,
      expected_answer: q.expectedAnswer,
      explanation: q.explanation,
      tags: q.tags || [],
      sort_order: idx + 1,
    }));

    await quizApi.saveQuestionsBatch(questionRecords);

    // Persist past attempts if present
    for (const q of questions) {
      if (Array.isArray(q.attemptsHistory) && q.attemptsHistory.length > 0) {
        for (const att of q.attemptsHistory) {
          await quizApi.saveAttempt({
            question_id: q.id,
            battery_id: battery.id,
            type: att.type,
            selected_index: att.selectedIndex,
            user_typed_answer: att.userTypedAnswer,
            is_correct: Boolean(att.isCorrect),
            ai_feedback: att.aiFeedback,
            created_at: new Date(att.timestamp || Date.now()).toISOString(),
          });
        }
      } else if (q.answered || q.selectedIndex !== null || q.userTypedAnswer) {
        // Fallback for single answered state
        const isCorrect =
          q.type === 'multiple_choice'
            ? q.selectedIndex === q.correctIndex
            : q.aiFeedback?.verdict === 'Correto';

        await quizApi.saveAttempt({
          question_id: q.id,
          battery_id: battery.id,
          type: q.type,
          selected_index: q.selectedIndex,
          user_typed_answer: q.userTypedAnswer,
          is_correct: isCorrect,
          ai_feedback: q.aiFeedback,
        });
      }
    }

    migratedCount++;
    return {
      batteryId: battery.id,
      title: battery.title,
      count: questions.length,
      tags,
    };
  };

  // Case 1: TipTap JSON Object
  if (typeof content === 'object') {
    const clone = JSON.parse(JSON.stringify(content)) as TipTapNodeLike;

    const traverse = async (node: TipTapNodeLike | null | undefined): Promise<void> => {
      if (!node) return;
      if (node.type === 'questionBlock' && node.attrs) {
        // Check if legacy questions exist
        const hasLegacyQuestions = Boolean(node.attrs.questions);
        if (hasLegacyQuestions) {
          const result = await persistLegacyBattery(
            node.attrs.title,
            node.attrs.description,
            node.attrs.layout,
            node.attrs.questions,
            typeof node.attrs.batteryId === 'string' ? node.attrs.batteryId : undefined
          );

          // Update attributes to lightweight embed
          node.attrs = {
            batteryId: result.batteryId,
            cachedTitle: result.title,
            cachedCount: result.count,
            cachedTags: result.tags,
          };
        } else if (typeof node.attrs.batteryId === 'string') {
          batteryIds.push(node.attrs.batteryId);
        }
      }

      if (Array.isArray(node.content)) {
        for (const child of node.content) {
          await traverse(child);
        }
      }
    };

    await traverse(clone);
    return {
      migrated: migratedCount > 0,
      migratedCount,
      batteryIds,
      newContent: clone,
    };
  }

  // Case 2: String payload (JSON or HTML)
  if (typeof content === 'string') {
    const trimmed = content.trim();

    // 2a. Serialized JSON string
    if (trimmed.startsWith('{') && trimmed.includes('"type":"questionBlock"')) {
      try {
        const parsed = JSON.parse(trimmed) as TipTapNodeLike;
        const res = await migratePageContentQuizzes(pageId, pageTitle, parsed, quizApi);
        return {
          ...res,
          newContent: JSON.stringify(res.newContent),
        };
      } catch {
        // Fallback to HTML handling below
      }
    }

    // 2b. HTML string
    if (trimmed.includes('question-block')) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const elements = doc.querySelectorAll('div[data-type="question-block"], div.question-block');

        if (elements.length > 0) {
          for (let i = 0; i < elements.length; i++) {
            const el = elements[i];
            const rawQuestions = el.getAttribute('data-questions');
            const existingBatteryId = el.getAttribute('data-battery-id') || undefined;

            if (rawQuestions) {
              const rawTitle = el.getAttribute('data-title');
              const rawDesc = el.getAttribute('data-description');
              const rawLayout = el.getAttribute('data-layout');

              const result = await persistLegacyBattery(
                rawTitle,
                rawDesc,
                rawLayout,
                rawQuestions,
                existingBatteryId
              );

              // Replace element attributes with clean embed attributes
              el.removeAttribute('data-questions');
              el.removeAttribute('data-chat-history');
              el.setAttribute('data-battery-id', result.batteryId);
              el.setAttribute('data-cached-title', result.title);
              el.setAttribute('data-cached-count', String(result.count));
              el.setAttribute('data-cached-tags', JSON.stringify(result.tags));
            } else if (existingBatteryId) {
              batteryIds.push(existingBatteryId);
            }
          }

          return {
            migrated: migratedCount > 0,
            migratedCount,
            batteryIds,
            newContent: doc.body.innerHTML,
          };
        }
      } catch (err) {
        console.warn('[QuizMigration] Falha ao migrar HTML da página:', err);
      }
    }
  }

  return { migrated: false, migratedCount: 0, batteryIds, newContent: content };
}

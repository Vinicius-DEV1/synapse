import type { IQuizApi } from '../../api/contracts/quiz';
import type { QuizBattery, QuizQuestion } from '../../types/quiz';

export interface StudyFilterOptions {
  tags?: string[];
  pageIds?: string[];
  status?: 'all' | 'unanswered' | 'incorrect';
  limit?: number;
  shuffle?: boolean;
}

export interface GeneratedStudySession {
  battery: QuizBattery;
  questions: QuizQuestion[];
}

/**
 * Generates an instant "Caderno de Erros" practice session containing
 * all questions the user answered incorrectly in their latest attempt.
 */
export async function generateErrorNotebook(
  quizApi: IQuizApi,
  options?: { title?: string; persist?: boolean }
): Promise<GeneratedStudySession | null> {
  const wrongAttempts = await quizApi.getWrongAttempts();
  if (wrongAttempts.length === 0) return null;

  const questions: QuizQuestion[] = [];
  const questionIdSet = new Set<string>();

  for (const att of wrongAttempts) {
    if (questionIdSet.has(att.question_id)) continue;
    questionIdSet.add(att.question_id);

    const q = await quizApi.getQuestionById(att.question_id);
    if (q && !q.deleted_at) {
      questions.push(q);
    }
  }

  if (questions.length === 0) return null;

  const title = options?.title || `Caderno de Erros (${new Date().toLocaleDateString('pt-BR')})`;
  const description = `Sessão de revisão contendo ${questions.length} questões com erros recentes.`;

  const batteryData: Partial<QuizBattery> & { title: string } = {
    title,
    description,
    layout: 'sequential',
    tags: ['revisão', 'erros'],
  };

  if (options?.persist) {
    const savedBattery = await quizApi.saveBattery(batteryData);
    // Link questions to new battery copy
    const clonedQuestions = questions.map((q, idx) => ({
      ...q,
      id: undefined,
      battery_id: savedBattery.id,
      sort_order: idx + 1,
    }));
    const savedQuestions = await quizApi.saveQuestionsBatch(clonedQuestions);
    return {
      battery: savedBattery,
      questions: savedQuestions,
    };
  }

  // In-memory synthetic session (zero database clutter)
  const syntheticBattery: QuizBattery = {
    id: `synthetic_errors_${Date.now()}`,
    title,
    description,
    layout: 'sequential',
    tags: ['revisão', 'erros'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    battery: syntheticBattery,
    questions,
  };
}

/**
 * Assembles a dynamic study session / simulated test filtered by tags, pages, or status.
 */
export async function generateFilteredStudySession(
  quizApi: IQuizApi,
  options: StudyFilterOptions
): Promise<GeneratedStudySession | null> {
  const allBatteries = await quizApi.getAllBatteries();
  const latestAttempts = await quizApi.getLatestAttempts();

  // Filter batteries by page if specified
  let targetBatteries = allBatteries;
  if (options.pageIds && options.pageIds.length > 0) {
    const pageSet = new Set(options.pageIds);
    targetBatteries = allBatteries.filter((b) => b.page_id && pageSet.has(b.page_id));
  }

  // Load all questions from target batteries
  const candidateQuestions: QuizQuestion[] = [];
  for (const b of targetBatteries) {
    const questions = await quizApi.getQuestionsByBattery(b.id);
    candidateQuestions.push(...questions);
  }

  if (candidateQuestions.length === 0) return null;

  // Filter by tags
  let filtered = candidateQuestions;
  if (options.tags && options.tags.length > 0) {
    const normalizedFilterTags = new Set(options.tags.map((t) => t.trim().toLowerCase()));
    filtered = filtered.filter((q) =>
      Array.isArray(q.tags) && q.tags.some((t) => normalizedFilterTags.has(t.trim().toLowerCase()))
    );
  }

  // Filter by status (unanswered / incorrect / all)
  if (options.status === 'unanswered') {
    filtered = filtered.filter((q) => !latestAttempts[q.id]);
  } else if (options.status === 'incorrect') {
    filtered = filtered.filter((q) => latestAttempts[q.id] && !latestAttempts[q.id].is_correct);
  }

  if (filtered.length === 0) return null;

  // Shuffle if requested
  if (options.shuffle) {
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
  }

  // Limit count
  const limit = options.limit && options.limit > 0 ? options.limit : filtered.length;
  const selectedQuestions = filtered.slice(0, limit);

  const tagLabel = options.tags && options.tags.length > 0 ? options.tags.join(', ') : 'Geral';
  const syntheticBattery: QuizBattery = {
    id: `synthetic_simulado_${Date.now()}`,
    title: `Simulado: ${tagLabel}`,
    description: `Sessão de treino com ${selectedQuestions.length} questões selecionadas.`,
    layout: 'sequential',
    tags: options.tags || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    battery: syntheticBattery,
    questions: selectedQuestions,
  };
}

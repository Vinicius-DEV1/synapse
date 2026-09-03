import type { ReferencedBattery, QuestionItem } from '../../../editor-extensions/quiz/types';
import { triggerToast } from '../../../ui/ToastContext';

interface TipTapNodeLike {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNodeLike[];
  [key: string]: unknown;
}

/**
 * Appends generated questions to a referenced quiz battery:
 * 1. Broadcasts to active editor node view for 0ms instant UI update.
 * 2. Persists updated page content in the database via window.api.updatePage if available.
 * 3. Updates the in-memory referenced battery questions collection.
 */
export async function appendQuestionsToBattery(
  battery: ReferencedBattery,
  newQuestions: QuestionItem[]
): Promise<boolean> {
  if (!battery || !newQuestions || newQuestions.length === 0) {
    return false;
  }

  try {
    // 1. Broadcast event to live mounted QuestionBlockNodeView
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('caderno-append-quiz-questions', {
          detail: {
            batteryId: battery.id,
            batteryTitle: battery.title,
            pageId: battery.pageId,
            questions: newQuestions,
          },
        })
      );
    }

    // 2. Persist to page content in database
    if (typeof window !== 'undefined' && window.api?.getPageContent && window.api?.updatePage) {
      try {
        const pageData = await window.api.getPageContent(battery.pageId);
        if (pageData && pageData.content) {
          let updatedContent: string | null = null;
          const trimmed = pageData.content.trim();

          // Case A: TipTap JSON
          if (trimmed.startsWith('{') && trimmed.includes('"type":"questionBlock"')) {
            try {
              const doc = JSON.parse(trimmed) as TipTapNodeLike;
              let modified = false;

              const traverse = (node: TipTapNodeLike) => {
                if (node.type === 'questionBlock' && node.attrs) {
                  const title = String(node.attrs.title || '').trim();
                  if (title === battery.title.trim()) {
                    const existingQuestions = Array.isArray(node.attrs.questions)
                      ? (node.attrs.questions as QuestionItem[])
                      : [];
                    node.attrs.questions = [...existingQuestions, ...newQuestions];
                    modified = true;
                  }
                }
                if (Array.isArray(node.content)) {
                  node.content.forEach(traverse);
                }
              };

              traverse(doc);
              if (modified) {
                updatedContent = JSON.stringify(doc);
              }
            } catch (jsonErr) {
              console.warn('[quizBatteryAppender] Failed to parse JSON page content:', jsonErr);
            }
          }

          // Case B: HTML markup
          if (!updatedContent && (trimmed.includes('data-type="question-block"') || trimmed.includes('question-block'))) {
            try {
              const container = document.createElement('div');
              container.innerHTML = pageData.content;
              const blocks = container.querySelectorAll('div[data-type="question-block"], div.question-block');

              blocks.forEach((el) => {
                const elTitle = (el.getAttribute('data-title') || '').trim();
                if (elTitle === battery.title.trim()) {
                  const rawQuestions = el.getAttribute('data-questions');
                  let existing: QuestionItem[] = [];
                  if (rawQuestions) {
                    try {
                      existing = JSON.parse(decodeURIComponent(rawQuestions));
                    } catch {
                      try {
                        existing = JSON.parse(rawQuestions);
                      } catch {
                        // ignore malformed questions attribute
                      }
                    }
                  }
                  const merged = [...existing, ...newQuestions];
                  el.setAttribute('data-questions', encodeURIComponent(JSON.stringify(merged)));
                }
              });

              updatedContent = container.innerHTML;
            } catch (htmlErr) {
              console.warn('[quizBatteryAppender] Failed to update HTML page content:', htmlErr);
            }
          }

          if (updatedContent) {
            await window.api.updatePage({
              id: battery.pageId,
              content: updatedContent,
            });
          }
        }
      } catch (dbErr) {
        console.warn('[quizBatteryAppender] Failed to persist questions to page database:', dbErr);
      }
    }

    // 3. Update in-memory reference
    battery.questions.push(...newQuestions);
    battery.questionCount = battery.questions.length;

    // 4. User feedback
    triggerToast(
      `${newQuestions.length} questão(ões) adicionada(s) à bateria "${battery.title}"!`,
      'success'
    );

    return true;
  } catch (err) {
    console.error('[quizBatteryAppender] Error appending questions:', err);
    triggerToast('Falha ao adicionar questões à bateria.', 'error');
    return false;
  }
}

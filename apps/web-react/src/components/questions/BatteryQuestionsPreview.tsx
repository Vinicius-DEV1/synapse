import React, { useState } from 'react';
import { CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import type { BatteryTreeNode } from '../../types/quiz';
import { useI18n } from '../../i18n';

const INITIAL_PREVIEW_LIMIT = 20;
const PREVIEW_PAGE_STEP = 20;

interface BatteryQuestionsPreviewProps {
  node: BatteryTreeNode;
}

export const BatteryQuestionsPreview = React.memo(function BatteryQuestionsPreview({
  node,
}: BatteryQuestionsPreviewProps) {
  const { t } = useI18n();
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_PREVIEW_LIMIT);

  if (node.questions.length === 0) return null;

  const visibleQuestions =
    node.questions.length > visibleLimit
      ? node.questions.slice(0, visibleLimit)
      : node.questions;
  const remainingCount = node.questions.length - visibleQuestions.length;

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-2.5">
      {visibleQuestions.map((q, idx) => {
        const attempt = node.latestAttempts?.[q.id];
        const isAnswered = Boolean(attempt);
        const isCorrect = attempt ? attempt.is_correct : false;

        return (
          <div
            key={q.id}
            className="p-3 rounded-xl bg-dark-bg/60 border border-white/[0.04] flex items-start justify-between gap-3 text-xs contain-list-item"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="font-mono text-zinc-500 text-[11px] shrink-0 mt-0.5">
                #{idx + 1}
              </span>
              <div className="min-w-0">
                <p className="text-zinc-200 leading-relaxed font-medium">
                  {q.question || t('questions.preview.noStatement')}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] text-zinc-400">
                  <span className="font-mono uppercase bg-white/5 px-1.5 py-0.5 rounded">
                    {q.type === 'multiple_choice' ? t('questions.preview.multipleChoice') : t('questions.preview.open')}
                  </span>
                  {(q.tags || []).map((tTag) => (
                    <span key={tTag} className="text-zinc-500">
                      #{tTag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="shrink-0">
              {isAnswered ? (
                isCorrect ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                    <CheckCircle2 size={11} />
                    <span>{t('questions.preview.correct')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/25">
                    <XCircle size={11} />
                    <span>{t('questions.preview.incorrect')}</span>
                  </span>
                )
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-zinc-500 border border-white/10">
                  {t('questions.preview.pending')}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {remainingCount > 0 && (
        <button
          type="button"
          onClick={() => setVisibleLimit((prev) => prev + PREVIEW_PAGE_STEP)}
          className="w-full py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-xs font-medium text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <ChevronDown size={14} />
          <span>
            Ver mais {Math.min(remainingCount, PREVIEW_PAGE_STEP)} de {remainingCount} questões restantes
          </span>
        </button>
      )}
    </div>
  );
});

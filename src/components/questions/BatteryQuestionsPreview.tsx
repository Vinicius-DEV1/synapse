import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { BatteryTreeNode } from '../../types/quiz';

interface BatteryQuestionsPreviewProps {
  node: BatteryTreeNode;
}

export const BatteryQuestionsPreview = React.memo(function BatteryQuestionsPreview({
  node,
}: BatteryQuestionsPreviewProps) {
  if (node.questions.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-2.5">
      {node.questions.map((q, idx) => {
        const attempt = node.latestAttempts?.[q.id];
        const isAnswered = Boolean(attempt);
        const isCorrect = attempt ? attempt.is_correct : false;

        return (
          <div
            key={q.id}
            className="p-3 rounded-xl bg-dark-bg/60 border border-white/[0.04] flex items-start justify-between gap-3 text-xs"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="font-mono text-zinc-500 text-[11px] shrink-0 mt-0.5">
                #{idx + 1}
              </span>
              <div className="min-w-0">
                <p className="text-zinc-200 leading-relaxed font-medium">
                  {q.question || 'Questão sem enunciado cadastrado'}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px] text-zinc-400">
                  <span className="font-mono uppercase bg-white/5 px-1.5 py-0.5 rounded">
                    {q.type === 'multiple_choice' ? 'Múltipla Escolha' : 'Discursiva'}
                  </span>
                  {(q.tags || []).map((t) => (
                    <span key={t} className="text-zinc-500">
                      #{t}
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
                    <span>Acertou</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/25">
                    <XCircle size={11} />
                    <span>Errou</span>
                  </span>
                )
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-zinc-500 border border-white/10">
                  Pendente
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

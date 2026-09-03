import { Tag } from 'lucide-react';
import type { QuestionItem } from '../types';

interface QuizTagsFilterProps {
  tags: string[];
  questions: QuestionItem[];
  selectedTagFilter: string | null;
  onSelectTag: (tag: string | null) => void;
}

export default function QuizTagsFilter({
  tags,
  questions,
  selectedTagFilter,
  onSelectTag,
}: QuizTagsFilterProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-white/[0.06]">
      <span className="text-[11px] font-medium text-dark-subtext flex items-center gap-1 mr-1">
        <Tag size={11} className="opacity-70" />
        <span>Filtrar:</span>
      </span>
      <button
        onClick={() => onSelectTag(null)}
        className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-all ${
          selectedTagFilter === null
            ? 'bg-white/10 border-white/15 text-white font-medium shadow-xs'
            : 'bg-white/[0.02] border-white/[0.05] text-dark-subtext hover:text-white hover:bg-white/[0.06]'
        }`}
      >
        Todas ({questions.length})
      </button>
      {tags.map((tag) => {
        const count = questions.filter((q) => q.tags?.includes(tag)).length;
        const isSelected = selectedTagFilter === tag;
        return (
          <button
            key={tag}
            onClick={() => onSelectTag(isSelected ? null : tag)}
            className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-all ${
              isSelected
                ? 'bg-brand-500/20 border-brand-500/30 text-brand-200 font-medium shadow-xs'
                : 'bg-white/[0.02] border-white/[0.05] text-dark-subtext hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            #{tag} ({count})
          </button>
        );
      })}
    </div>
  );
}
